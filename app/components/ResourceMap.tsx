'use client';

import { useCallback, forwardRef, useImperativeHandle, useRef, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  Position,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
  applyNodeChanges,
} from 'reactflow';
import { toPng } from 'html-to-image';
import 'reactflow/dist/style.css';

interface AWSResource {
  type: string;
  serviceType: string;
  name: string;
  id: string;
  region: string;
  url: string;
  relationships?: {
    securityGroups?: string[];
    targetGroups?: string[];
    loadBalancer?: string;
    dnsRecords?: string[];
    certificate?: string;
    instances?: string[];
    volumes?: string[];
  };
}

interface ResourceMapProps {
  resources: AWSResource[];
}

const serviceColors = {
  'EC2': '#FFD700',
  'ELB': '#98FB98',
  'RDS': '#87CEEB',
  'S3': '#DDA0DD',
  'Route 53': '#F0E68C',
  'ACM': '#E6E6FA',
  'IAM': '#FFB6C1',
  'ECS': '#98FB98'
};

const FlowWithDownload = forwardRef((props: ResourceMapProps, ref) => {
  const { resources } = props;
  const flowRef = useRef<HTMLDivElement>(null);
  const { toSVG } = useReactFlow();
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);

  const standardMarker = {
    type: MarkerType.Arrow,
    width: 12,
    height: 12
  };

  const createNodes = useCallback(() => {
    const nodes: Node[] = [];
    const levelSpacing = 200;
    const nodeSpacing = 150;
    const nodeWidth = 200;
    const nodeHeight = 100;

    // Define service hierarchy levels with better distribution
    const hierarchyLevels = {
      'Route 53': 0,           // DNS Layer
      'ACM': 1,               // Security Layer
      'ELB': 2,               // Load Balancer Layer
      'EC2': 3,               // Compute Layer - Left
      'ECS': 3,               // Compute Layer - Center
      'Lambda': 3,            // Compute Layer - Right
      'ECR': 4,               // Storage Layer - Left
      'RDS': 4,               // Storage Layer - Center
      'S3': 4,                // Storage Layer - Right
      'IAM': 5,               // Management Layer - Left
      'EventBridge': 5        // Management Layer - Right
    };

    // Group resources by service type
    const serviceGroups = resources.reduce((acc, resource) => {
      if (!acc[resource.serviceType]) {
        acc[resource.serviceType] = [];
      }
      acc[resource.serviceType].push(resource);
      return acc;
    }, {} as Record<string, AWSResource[]>);

    // Calculate positions for each service group
    Object.entries(serviceGroups).forEach(([serviceType, serviceResources]) => {
      const level = hierarchyLevels[serviceType as keyof typeof hierarchyLevels] || 0;
      const y = level * levelSpacing;
      
      // Calculate total width needed for this level
      const totalWidth = serviceResources.length * (nodeWidth + nodeSpacing) - nodeSpacing;
      const startX = -(totalWidth / 2);

      serviceResources.forEach((resource, index) => {
        const x = startX + (index * (nodeWidth + nodeSpacing));
        nodes.push({
          id: resource.id,
          data: {
            label: (
              <div 
                className="text-sm cursor-pointer font-medium" 
                onClick={() => window.open(resource.url, '_blank')}
              >
                <div className="font-semibold mb-1 truncate max-w-[180px]">{resource.name || resource.id}</div>
                <div className="text-zinc-600 truncate max-w-[180px]">{resource.type}</div>
                <div className="text-zinc-500 text-xs mt-1">{resource.region}</div>
              </div>
            ),
          },
          position: { x, y },
          draggable: true,
          style: {
            background: serviceColors[resource.serviceType as keyof typeof serviceColors] || 'white',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: '12px',
            padding: '12px',
            width: nodeWidth,
            height: nodeHeight,
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease',
            cursor: 'move',
          },
        });
      });
    });

    return nodes;
  }, [resources]);

  const [nodes, setNodes] = useState(() => createNodes());

  useImperativeHandle(ref, () => ({
    exportToSvg: async () => {
      try {
        // Get the SVG string using ReactFlow's built-in method
        const svg = await toSVG();
        
        // Create a blob from the SVG string
        const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        
        // Create and trigger download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `aws-resource-map-${new Date().toISOString()}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error exporting SVG:', error);
        throw error;
      }
    }
  }));

  const createEdges = useCallback(() => {
    const edges: Edge[] = [];
    const addedEdges = new Set<string>();

    // Define standard edge options with conditional styling
    const standardEdgeOptions = {
      type: 'smoothstep',
      animated: true,
      markerEnd: standardMarker,
      style: { 
        stroke: '#94a3b8',
        strokeWidth: 9,
        opacity: 0.8
      },
      routing: 'orthogonal',
      pathOptions: {
        offset: 25,
        borderRadius: 20,
      },
      className: 'cursor-pointer',
    };

    // Helper function to create edge with selected state
    const createEdgeWithSelection = (edge: Edge) => ({
      ...edge,
      style: {
        ...standardEdgeOptions.style,
        stroke: edge.id === selectedEdge ? '#ef4444' : '#94a3b8', // Red when selected
      },
    });

    resources.forEach(resource => {
      // Security Group connections
      if (resource.relationships?.securityGroups) {
        resource.relationships.securityGroups.forEach(sgId => {
          const edgeId = `${resource.id}-${sgId}-sg`;
          if (!addedEdges.has(edgeId)) {
            edges.push(createEdgeWithSelection({
              id: edgeId,
              source: resource.id,
              target: sgId,
              label: 'Security Group',
              ...standardEdgeOptions,
            }));
            addedEdges.add(edgeId);
          }
        });
      }

      // Load Balancer connections
      if (resource.type === 'Target Group' && resource.relationships?.loadBalancer) {
        const edgeId = `${resource.relationships.loadBalancer}-${resource.id}-tg`;
        edges.push(createEdgeWithSelection({
          id: edgeId,
          source: resource.relationships.loadBalancer,
          target: resource.id,
          label: 'Target Group',
          ...standardEdgeOptions,
        }));
        addedEdges.add(edgeId);
      }

      // Route 53 Record connections to Load Balancers
      if (resource.type === 'Route 53 Record') {
        // Find associated load balancer by DNS name
        const loadBalancers = resources.filter(r => 
          r.type === 'Application Load Balancer' && 
          r.relationships?.dnsRecords?.some(dns => {
            const cleanDns = dns.replace(/\.$/, ''); // Remove trailing dot if present
            const cleanRecordName = resource.name.replace(/\.$/, '');
            return cleanRecordName === cleanDns || 
                   cleanRecordName.endsWith('.' + cleanDns) || 
                   cleanDns.endsWith('.' + cleanRecordName);
          })
        );

        loadBalancers.forEach(loadBalancer => {
          const edgeId = `${resource.id}-${loadBalancer.id}-dns`;
          if (!addedEdges.has(edgeId)) {
            edges.push(createEdgeWithSelection({
              id: edgeId,
              source: resource.id,
              target: loadBalancer.id,
              label: 'DNS Alias',
              ...standardEdgeOptions,
            }));
            addedEdges.add(edgeId);
          }
        });
      }

      // Route 53 Hosted Zone to Record connections
      if (resource.type === 'Route 53 Record') {
        const hostedZone = resources.find(r => 
          r.type === 'Route 53 Hosted Zone' && 
          resource.id.startsWith(r.id)
        );

        if (hostedZone) {
          const edgeId = `${hostedZone.id}-${resource.id}-zone`;
          if (!addedEdges.has(edgeId)) {
            edges.push(createEdgeWithSelection({
              id: edgeId,
              source: hostedZone.id,
              target: resource.id,
              label: 'Record',
              ...standardEdgeOptions,
            }));
            addedEdges.add(edgeId);
          }
        }
      }

      // Certificate connections
      if (resource.type === 'ACM Certificate' && resource.relationships?.loadBalancer) {
        const edgeId = `${resource.id}-${resource.relationships.loadBalancer}-cert`;
        edges.push(createEdgeWithSelection({
          id: edgeId,
          source: resource.id,
          target: resource.relationships.loadBalancer,
          label: 'SSL/TLS',
          ...standardEdgeOptions,
        }));
        addedEdges.add(edgeId);
      }

      // Volume connections
      if (resource.relationships?.volumes) {
        resource.relationships.volumes.forEach(volumeId => {
          const edgeId = `${resource.id}-${volumeId}-vol`;
          edges.push(createEdgeWithSelection({
            id: edgeId,
            source: resource.id,
            target: volumeId,
            label: 'Volume',
            ...standardEdgeOptions,
          }));
          addedEdges.add(edgeId);
        });
      }

      // Internet Gateway to Load Balancer connections
      if (resource.type === 'Application Load Balancer') {
        // Find IGW in the same region
        const igw = resources.find(r => 
          r.type === 'Internet Gateway' && 
          r.region === resource.region
        );

        if (igw) {
          const edgeId = `${igw.id}-${resource.id}-igw`;
          if (!addedEdges.has(edgeId)) {
            edges.push(createEdgeWithSelection({
              id: edgeId,
              source: igw.id,
              target: resource.id,
              label: 'Internet Access',
              ...standardEdgeOptions,
            }));
            addedEdges.add(edgeId);
          }
        }
      }

      // NAT Gateway to Private Resources
      if (resource.type === 'NAT Gateway') {
        // Connect NAT Gateway to private Load Balancers
        const privateLoadBalancers = resources.filter(r => 
          r.type === 'Application Load Balancer' && 
          r.region === resource.region
        );

        privateLoadBalancers.forEach(lb => {
          const edgeId = `${resource.id}-${lb.id}-nat`;
          if (!addedEdges.has(edgeId)) {
            edges.push(createEdgeWithSelection({
              id: edgeId,
              source: resource.id,
              target: lb.id,
              label: 'NAT Access',
              ...standardEdgeOptions,
            }));
            addedEdges.add(edgeId);
          }
        });
      }

      // Internet Gateway to NAT Gateway
      if (resource.type === 'NAT Gateway') {
        const igw = resources.find(r => 
          r.type === 'Internet Gateway' && 
          r.region === resource.region
        );

        if (igw) {
          const edgeId = `${igw.id}-${resource.id}-igw-nat`;
          if (!addedEdges.has(edgeId)) {
            edges.push(createEdgeWithSelection({
              id: edgeId,
              source: igw.id,
              target: resource.id,
              label: 'Internet Access',
              ...standardEdgeOptions,
            }));
            addedEdges.add(edgeId);
          }
        }
      }

      // ECS Service to Target Group connections
      if (resource.type === 'ECS Service') {
        const targetGroups = resources.filter(r => 
          r.type === 'Target Group' && 
          r.region === resource.region
        );

        targetGroups.forEach(tg => {
          const edgeId = `${resource.id}-${tg.id}-tg`;
          if (!addedEdges.has(edgeId)) {
            edges.push(createEdgeWithSelection({
              id: edgeId,
              source: resource.id,
              target: tg.id,
              label: 'Service Registration',
              ...standardEdgeOptions,
            }));
            addedEdges.add(edgeId);
          }
        });
      }

      // Lambda to EventBridge Rules
      if (resource.type === 'EventBridge Rule') {
        const lambdaFunctions = resources.filter(r => 
          r.type === 'Lambda Function' && 
          r.region === resource.region
        );

        lambdaFunctions.forEach(lambda => {
          const edgeId = `${resource.id}-${lambda.id}-event`;
          if (!addedEdges.has(edgeId)) {
            edges.push(createEdgeWithSelection({
              id: edgeId,
              source: resource.id,
              target: lambda.id,
              label: 'Trigger',
              ...standardEdgeOptions,
            }));
            addedEdges.add(edgeId);
          }
        });
      }

      // ECS Service to Cluster connections
      if (resource.type === 'ECS Service') {
        const cluster = resources.find(r => 
          r.type === 'ECS Cluster' && 
          resource.id.includes(r.id)
        );

        if (cluster) {
          const edgeId = `${cluster.id}-${resource.id}-cluster`;
          if (!addedEdges.has(edgeId)) {
            edges.push(createEdgeWithSelection({
              id: edgeId,
              source: cluster.id,
              target: resource.id,
              label: 'Service',
              ...standardEdgeOptions,
            }));
            addedEdges.add(edgeId);
          }
        }
      }

      // Lambda to API Gateway (if exists)
      if (resource.type === 'Lambda Function') {
        const apiGateways = resources.filter(r => 
          r.type === 'API Gateway' && 
          r.region === resource.region
        );

        apiGateways.forEach(api => {
          const edgeId = `${api.id}-${resource.id}-api`;
          if (!addedEdges.has(edgeId)) {
            edges.push(createEdgeWithSelection({
              id: edgeId,
              source: api.id,
              target: resource.id,
              label: 'Integration',
              ...standardEdgeOptions,
            }));
            addedEdges.add(edgeId);
          }
        });
      }
    });

    return edges;
  }, [resources, selectedEdge]);

  // Add edge click handler
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge.id === selectedEdge ? null : edge.id);
  }, [selectedEdge]);

  // Add onNodesChange handler to ReactFlow component
  const onNodesChange = useCallback(
    (changes: any) => {
      setNodes((nds) => {
        return applyNodeChanges(changes, nds);
      });
    },
    [setNodes]
  );

  return (
    <div 
      ref={flowRef} 
      style={{ 
        width: '2000px', 
        height: '1200px',
        background: 'rgb(24,24,27)',
        borderRadius: '16px',
        overflow: 'hidden',
        margin: '0 auto'
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={createEdges()}
        onNodesChange={onNodesChange}
        fitView
        minZoom={0.1}
        maxZoom={4}
        onEdgeClick={onEdgeClick}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { 
            stroke: '#94a3b8', 
            strokeWidth: 9
          },
          animated: true,
          markerEnd: standardMarker,
          routing: 'orthogonal',
        }}
      >
        <Background color="#333" gap={16} />
        <Controls 
          style={{
            button: {
              backgroundColor: '#27272a',
              border: '1px solid #3f3f46',
              color: '#fff',
            },
          }}
        />
        <MiniMap 
          style={{ 
            backgroundColor: '#27272a',
            border: '1px solid #3f3f46',
          }} 
        />
      </ReactFlow>
    </div>
  );
});

const ResourceMap = forwardRef((props: ResourceMapProps, ref) => {
  return (
    <div style={{ 
      width: '2000px', 
      height: '1200px',
      background: 'white',
      margin: '0 auto'
    }}>
      <ReactFlowProvider>
        <FlowWithDownload {...props} ref={ref} />
      </ReactFlowProvider>
    </div>
  );
});

ResourceMap.displayName = 'ResourceMap';

export default ResourceMap; 