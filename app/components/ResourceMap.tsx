'use client';

import { useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
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

  useImperativeHandle(ref, () => ({
    exportToSvg: async () => {
      if (flowRef.current) {
        try {
          const dataUrl = await toPng(flowRef.current, {
            quality: 1,
            backgroundColor: 'white',
            width: flowRef.current.offsetWidth,
            height: flowRef.current.offsetHeight,
          });
          
          // Create a temporary link element
          const link = document.createElement('a');
          link.download = 'aws-resource-map.png';
          link.href = dataUrl;
          link.click();
        } catch (error) {
          console.error('Error exporting image:', error);
        }
      }
    }
  }));

  const createNodes = useCallback(() => {
    const nodes: Node[] = [];
    const servicePositions: Record<string, { x: number, y: number, count: number }> = {};
    const spacing = 300;

    // Group resources by service type
    const serviceGroups = resources.reduce((acc, resource) => {
      if (!acc[resource.serviceType]) {
        acc[resource.serviceType] = [];
      }
      acc[resource.serviceType].push(resource);
      return acc;
    }, {} as Record<string, AWSResource[]>);

    // Calculate initial positions for each service group
    Object.keys(serviceGroups).forEach((serviceType, index) => {
      servicePositions[serviceType] = {
        x: index * spacing,
        y: 100,
        count: 0
      };
    });

    resources.forEach(resource => {
      const pos = servicePositions[resource.serviceType];
      nodes.push({
        id: resource.id,
        data: {
          label: (
            <div 
              className="text-sm cursor-pointer font-medium" 
              onClick={() => window.open(resource.url, '_blank')}
            >
              <div className="font-semibold mb-1">{resource.name || resource.id}</div>
              <div className="text-zinc-600">{resource.type}</div>
              <div className="text-zinc-500 text-xs mt-1">{resource.region}</div>
            </div>
          ),
        },
        position: { x: pos.x, y: pos.y + (pos.count * 150) },
        style: {
          background: serviceColors[resource.serviceType as keyof typeof serviceColors] || 'white',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: '12px',
          padding: '12px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
        },
      });
      pos.count++;
    });

    return nodes;
  }, [resources]);

  const createEdges = useCallback(() => {
    const edges: Edge[] = [];
    const addedEdges = new Set<string>();

    resources.forEach(resource => {
      // Security Group connections
      if (resource.relationships?.securityGroups) {
        resource.relationships.securityGroups.forEach(sgId => {
          const edgeId = `${resource.id}-${sgId}-sg`;
          if (!addedEdges.has(edgeId)) {
            edges.push({
              id: edgeId,
              source: resource.id,
              target: sgId,
              label: 'Security Group',
              type: 'smoothstep',
              animated: true,
              markerEnd: { type: MarkerType.Arrow },
              style: { stroke: '#666' },
            });
            addedEdges.add(edgeId);
          }
        });
      }

      // Load Balancer connections
      if (resource.type === 'Target Group' && resource.relationships?.loadBalancer) {
        const edgeId = `${resource.relationships.loadBalancer}-${resource.id}-tg`;
        edges.push({
          id: edgeId,
          source: resource.relationships.loadBalancer,
          target: resource.id,
          label: 'Target Group',
          type: 'smoothstep',
          animated: true,
          markerEnd: { type: MarkerType.Arrow },
          style: { stroke: '#666' },
        });
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
            edges.push({
              id: edgeId,
              source: resource.id,
              target: loadBalancer.id,
              label: 'DNS Alias',
              type: 'smoothstep',
              animated: true,
              markerEnd: { type: MarkerType.Arrow },
              style: { stroke: '#666' },
            });
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
            edges.push({
              id: edgeId,
              source: hostedZone.id,
              target: resource.id,
              label: 'Record',
              type: 'smoothstep',
              animated: true,
              markerEnd: { type: MarkerType.Arrow },
              style: { stroke: '#666' },
            });
            addedEdges.add(edgeId);
          }
        }
      }

      // Certificate connections
      if (resource.type === 'ACM Certificate' && resource.relationships?.loadBalancer) {
        const edgeId = `${resource.id}-${resource.relationships.loadBalancer}-cert`;
        edges.push({
          id: edgeId,
          source: resource.id,
          target: resource.relationships.loadBalancer,
          label: 'SSL/TLS',
          type: 'smoothstep',
          animated: true,
          markerEnd: { type: MarkerType.Arrow },
          style: { stroke: '#666' },
        });
      }

      // Volume connections
      if (resource.relationships?.volumes) {
        resource.relationships.volumes.forEach(volumeId => {
          const edgeId = `${resource.id}-${volumeId}-vol`;
          edges.push({
            id: edgeId,
            source: resource.id,
            target: volumeId,
            label: 'Volume',
            type: 'smoothstep',
            animated: true,
            markerEnd: { type: MarkerType.Arrow },
            style: { stroke: '#666' },
          });
        });
      }
    });

    return edges;
  }, [resources]);

  return (
    <div 
      ref={flowRef} 
      style={{ 
        width: '100%', 
        height: '600px', 
        background: 'rgb(24,24,27)',
        borderRadius: '16px',
        overflow: 'hidden'
      }}
    >
      <ReactFlow
        nodes={createNodes()}
        edges={createEdges()}
        fitView
        minZoom={0.1}
        maxZoom={4}
        defaultEdgeOptions={{
          style: { stroke: '#666', strokeWidth: 2 },
          animated: true,
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
    <div style={{ width: '100%', height: '600px', background: 'white' }}>
      <ReactFlowProvider>
        <FlowWithDownload {...props} ref={ref} />
      </ReactFlowProvider>
    </div>
  );
});

ResourceMap.displayName = 'ResourceMap';

export default ResourceMap; 