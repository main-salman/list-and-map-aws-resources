'use client';

import { useCallback, forwardRef, useImperativeHandle, useRef, useState, useEffect, useMemo } from 'react';
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
  Panel,
  NodeChange,
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
    cloudfront?: string;
    repository?: string;
    distribution?: string;
    origin?: string;
    hostedZone?: string;
    aliases?: string[];
    wafAcl?: string;         // WAF Web ACL
    wafRules?: string[];     // WAF Rules
    wafAssociations?: string[]; // Resources protected by WAF
    protectedBy?: string;    // WAF ACL protecting this resource
    services?: string[];      // For ECS services
    protects?: string[];      // Resources this security group protects
    bucket?: string;          // For S3
  };
}

interface ResourceMapProps {
  resources: AWSResource[];
  onLoad?: () => void;
}

interface LayoutSettings {
  verticalSpacing: number;
  horizontalSpacing: number;
  hierarchyType: 'layered' | 'grouped' | 'regional';
}

interface ResourceMapRef {
  exportToDrawio: () => void;
  exportToPng: () => Promise<void>;
}

const serviceColors = {
  'EC2': '#FFD700',
  'ELB': '#98FB98',
  'RDS': '#87CEEB',
  'S3': '#DDA0DD',
  'Route 53': '#F0E68C',
  'ACM': '#E6E6FA',
  'IAM': '#FFB6C1',
  'ECS': '#98FB98',
  'WAF': '#FF69B4',  // Hot pink for WAF
  'Security Groups': '#FFA07A',  // Light salmon for security groups
  'CloudFront': '#FFB6C1',  // Light pink for CloudFront
};

// Define these outside the component
const nodeTypes = {
  // ... your node types
};

const edgeTypes = {
  // ... your edge types
};

const Flow = forwardRef<ResourceMapRef, ResourceMapProps>((props, ref) => {
  const { resources, onLoad } = props;
  const flowRef = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>({
    verticalSpacing: 150,
    horizontalSpacing: 200,
    hierarchyType: 'regional'
  });
  const [nodes, setNodes] = useState<Node[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Wait for both flowRef and reactFlowInstance to be available
  useEffect(() => {
    if (flowRef.current && reactFlowInstance) {
      setIsReady(true);
    }
  }, [flowRef.current, reactFlowInstance]);

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    exportToDrawio: () => {
      console.log('[Flow] exportToDrawio called:', {
        isInitialized,
        hasInstance: !!reactFlowInstance,
        nodeCount: reactFlowInstance?.getNodes().length
      });

      if (!reactFlowInstance) {
        console.error('[Flow] ReactFlow instance not available');
        return;
      }

      try {
        const currentNodes = reactFlowInstance.getNodes();
        const currentEdges = reactFlowInstance.getEdges();
        
        console.log('[Flow] Export data:', {
          nodes: currentNodes.length,
          edges: currentEdges.length,
          nodeData: currentNodes.map(n => ({
            id: n.id,
            type: n.type,
            position: n.position
          }))
        });

        console.log('Starting draw.io export...');
        const drawioXml = `
<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}">
  <diagram id="aws-resources" name="AWS Resources">
    <mxGraphModel dx="1422" dy="798" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="2000" pageHeight="1200">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        ${currentNodes.map((node) => {
          try {
            console.log('Processing node:', node);
            const name = node.data.label.props.children[0].props.children;
            const type = node.data.label.props.children[1].props.children;
            const region = node.data.label.props.children[2].props.children;
            
            return `
            <mxCell id="${node.id}" value="${name}&#10;${type}&#10;${region}" 
                    style="rounded=1;whiteSpace=wrap;html=1;fillColor=${node.style?.background || '#ffffff'};strokeColor=#666666;fontSize=12;fontColor=#333333;"
                    vertex="1" parent="1">
              <mxGeometry x="${node.position.x}" y="${node.position.y}" width="160" height="80" as="geometry"/>
            </mxCell>`;
          } catch (err) {
            console.error('Error processing node:', node, err);
            return '';
          }
        }).join('\n')}
        ${currentEdges.map(edge => {
          console.log('Processing edge:', edge);
          return `
          <mxCell id="${edge.id}" value="${edge.label || ''}" 
                  style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#666666;fontSize=11;"
                  edge="1" parent="1" source="${edge.source}" target="${edge.target}">
            <mxGeometry relative="1" as="geometry"/>
          </mxCell>`;
        }).join('\n')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

        console.log('XML generated:', drawioXml);

        console.log('Creating download...');
        const blob = new Blob([drawioXml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `aws-resources-${new Date().toISOString()}.drawio`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('Draw.io export completed');
      } catch (error) {
        console.error('[Flow] Draw.io export error:', error);
      }
    },
    exportToPng: async () => {
      console.log('[Flow] exportToPng called:', {
        hasFlowRef: !!flowRef.current,
        isInitialized
      });

      if (!flowRef.current) {
        console.error('[Flow] Flow ref not available for PNG export');
        return;
      }

      try {
        const dataUrl = await toPng(flowRef.current, {
          backgroundColor: 'rgb(24,24,27)',
          width: 2000,
          height: 1200,
          quality: 1,
          pixelRatio: 2
        });
        
        const link = document.createElement('a');
        link.download = 'aws-resource-map.png';
        link.href = dataUrl;
        link.click();
      } catch (error) {
        console.error('[Flow] PNG export error:', error);
      }
    }
  }), [isInitialized, reactFlowInstance, flowRef.current]);

  const standardMarker = {
    type: MarkerType.Arrow,
    width: 12,
    height: 12
  };

  const createNodes = useCallback(() => {
    const nodes: Node[] = [];
    const { verticalSpacing, horizontalSpacing, hierarchyType } = layoutSettings;

    const hierarchyLevels = {
      'Route 53': 0,     // DNS Layer
      'CloudFront': 1,   // CDN Layer
      'WAF': 1,         // Security Layer (same level as CloudFront)
      'ACM': 1,         // Security Layer
      'Security Groups': 2, // Security Layer
      'ELB': 2,         // Load Balancer Layer
      'EC2': 3,         // Compute Layer
      'ECS': 3,         // Compute Layer
      'Lambda': 3,      // Compute Layer
      'RDS': 4,         // Database Layer
      'S3': 4,          // Storage Layer
      'ECR': 4,         // Container Registry Layer
      'IAM': 5,         // Management Layer
    };

    if (hierarchyType === 'regional') {
      // Group by region first
      const regionGroups = resources.reduce((acc, resource) => {
        if (!acc[resource.region]) {
          acc[resource.region] = [];
        }
        acc[resource.region].push(resource);
        return acc;
      }, {} as Record<string, AWSResource[]>);

      let currentY = 0;
      const regionSpacing = 300;

      Object.entries(regionGroups).forEach(([region, regionResources]) => {
        // For each region, create a service-based layout
        const serviceGroups = regionResources.reduce((acc, resource) => {
          if (!acc[resource.serviceType]) {
            acc[resource.serviceType] = [];
          }
          acc[resource.serviceType].push(resource);
          return acc;
        }, {} as Record<string, AWSResource[]>);

        let currentX = 0;
        const groupSpacing = 100;

        Object.entries(serviceGroups).forEach(([serviceType, serviceResources]) => {
          const groupWidth = Math.ceil(Math.sqrt(serviceResources.length));
          
          serviceResources.forEach((resource, index) => {
            const row = Math.floor(index / groupWidth);
            const col = index % groupWidth;
            const x = currentX + col * (160 + horizontalSpacing);
            const y = currentY + row * verticalSpacing;
            nodes.push(createNodeObject(resource, x, y));
          });

          currentX += (groupWidth * (160 + horizontalSpacing)) + groupSpacing;
        });

        currentY += regionSpacing;
      });
    } else if (hierarchyType === 'layered') {
      // Existing layered layout with improved spacing
      Object.entries(serviceGroups).forEach(([serviceType, serviceResources]) => {
        const level = hierarchyLevels[serviceType as keyof typeof hierarchyLevels] || 0;
        const y = level * verticalSpacing + 50;
        
        const totalWidth = serviceResources.length * (160 + horizontalSpacing) - horizontalSpacing;
        const startX = -(totalWidth / 2);

        serviceResources.forEach((resource, index) => {
          const x = startX + (index * (160 + horizontalSpacing));
          nodes.push(createNodeObject(resource, x, y));
        });
      });
    } else if (hierarchyType === 'grouped') {
      // Grouped by service type in a grid
      let currentX = 0;
      let currentY = 0;
      const groupSpacing = 100;

      Object.entries(serviceGroups).forEach(([serviceType, serviceResources]) => {
        const groupWidth = Math.ceil(Math.sqrt(serviceResources.length));
        
        serviceResources.forEach((resource, index) => {
          const row = Math.floor(index / groupWidth);
          const col = index % groupWidth;
          const x = currentX + col * (160 + horizontalSpacing);
          const y = currentY + row * verticalSpacing;
          nodes.push(createNodeObject(resource, x, y));
        });

        currentX += (groupWidth * (160 + horizontalSpacing)) + groupSpacing;
        if (currentX > 1500) {
          currentX = 0;
          currentY += (Math.ceil(serviceResources.length / groupWidth) * verticalSpacing) + groupSpacing;
        }
      });
    } else if (hierarchyType === 'circular') {
      // Circular layout
      const totalNodes = resources.length;
      const radius = Math.max(totalNodes * 50, 400);
      const angleStep = (2 * Math.PI) / totalNodes;

      resources.forEach((resource, index) => {
        const angle = index * angleStep;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        nodes.push(createNodeObject(resource, x, y));
      });
    }

    return nodes;
  }, [resources, layoutSettings]);

  const createNodeObject = (resource: AWSResource, x: number, y: number) => ({
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
      width: 160,
      height: 80,
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    },
  });

  const createEdges = useCallback(() => {
    const edges: Edge[] = [];
    const usedKeys = new Set<string>();

    const createUniqueEdgeId = (base: string) => {
      let id = base;
      let counter = 1;
      while (usedKeys.has(id)) {
        id = `${base}-${counter}`;
        counter++;
      }
      usedKeys.add(id);
      return id;
    };

    resources.forEach(resource => {
      if (resource.relationships) {
        // Handle Route53 relationships first
        if (resource.serviceType === 'Route 53') {
          // Connect to Load Balancers
          if (resource.relationships.loadBalancer) {
            const edgeId = createUniqueEdgeId(`route53-alb-${resource.id}-${resource.relationships.loadBalancer}`);
            edges.push({
              id: edgeId,
              source: resource.id,
              target: resource.relationships.loadBalancer,
              label: 'ALB Record',
              type: 'smoothstep',
              style: { stroke: selectedEdge === edgeId ? '#60a5fa' : '#F0E68C' }
            });
          }

          // Connect to CloudFront distributions
          if (resource.relationships.cloudfront) {
            const edgeId = createUniqueEdgeId(`route53-cf-${resource.id}-${resource.relationships.cloudfront}`);
            edges.push({
              id: edgeId,
              source: resource.id,
              target: resource.relationships.cloudfront,
              label: 'CloudFront Record',
              type: 'smoothstep',
              style: { stroke: selectedEdge === edgeId ? '#60a5fa' : '#F0E68C' }
            });
          }

          // Connect to S3 buckets
          if (resource.relationships.bucket) {
            const edgeId = createUniqueEdgeId(`route53-s3-${resource.id}-${resource.relationships.bucket}`);
            edges.push({
              id: edgeId,
              source: resource.id,
              target: resource.relationships.bucket,
              label: 'S3 Record',
              type: 'smoothstep',
              style: { stroke: selectedEdge === edgeId ? '#60a5fa' : '#F0E68C' }
            });
          }

          // Connect to hosted zones
          if (resource.relationships.hostedZone) {
            const edgeId = createUniqueEdgeId(`route53-hz-${resource.id}-${resource.relationships.hostedZone}`);
            edges.push({
              id: edgeId,
              source: resource.id,
              target: resource.relationships.hostedZone,
              label: 'Hosted Zone',
              type: 'smoothstep',
              style: { stroke: selectedEdge === edgeId ? '#60a5fa' : '#F0E68C' }
            });
          }
        }

        // Handle resources that have Route53 records
        if (resource.relationships.dnsRecords) {
          resource.relationships.dnsRecords.forEach(recordId => {
            const edgeId = createUniqueEdgeId(`dns-${resource.id}-${recordId}`);
            edges.push({
              id: edgeId,
              source: recordId,  // Reverse the direction - Route53 points to the resource
              target: resource.id,
              label: 'DNS Record',
              type: 'smoothstep',
              style: { stroke: selectedEdge === edgeId ? '#60a5fa' : '#F0E68C' }
            });
          });
        }

        // Handle Route53 aliases
        if (resource.relationships.aliases) {
          resource.relationships.aliases.forEach(aliasId => {
            const edgeId = createUniqueEdgeId(`alias-${resource.id}-${aliasId}`);
            edges.push({
              id: edgeId,
              source: resource.id,
              target: aliasId,
              label: 'Alias',
              type: 'smoothstep',
              style: { stroke: selectedEdge === edgeId ? '#60a5fa' : '#F0E68C' }
            });
          });
        }

        // Security Group relationships
        if (resource.relationships.securityGroups) {
          resource.relationships.securityGroups.forEach(sgId => {
            const edgeId = createUniqueEdgeId(`${resource.id}-${sgId}`);
            edges.push({
              id: edgeId,
              source: resource.id,
              target: sgId,
              label: 'Security Group',
              type: 'smoothstep',
              style: { stroke: selectedEdge === edgeId ? '#60a5fa' : '#94a3b8' }
            });
          });
        }

        // Target Group relationships
        if (resource.relationships.targetGroups) {
          resource.relationships.targetGroups.forEach(tgArn => {
            const edgeId = createUniqueEdgeId(`${resource.id}-${tgArn}`);
            edges.push({
              id: edgeId,
              source: resource.id,
              target: tgArn,
              label: 'Target Group',
              type: 'smoothstep',
              style: { stroke: selectedEdge === edgeId ? '#60a5fa' : '#94a3b8' }
            });
          });
        }

        // Load Balancer relationships
        if (resource.relationships.loadBalancer) {
          const edgeId = createUniqueEdgeId(`${resource.id}-${resource.relationships.loadBalancer}`);
          edges.push({
            id: edgeId,
            source: resource.id,
            target: resource.relationships.loadBalancer,
            label: 'Load Balancer',
            type: 'smoothstep',
            style: { stroke: selectedEdge === edgeId ? '#60a5fa' : '#94a3b8' }
          });
        }

        // Certificate relationships
        if (resource.relationships.certificate) {
          const edgeId = createUniqueEdgeId(`${resource.id}-${resource.relationships.certificate}`);
          edges.push({
            id: edgeId,
            source: resource.id,
            target: resource.relationships.certificate,
            label: 'Certificate',
            type: 'smoothstep',
            style: { stroke: selectedEdge === edgeId ? '#60a5fa' : '#94a3b8' }
          });
        }

        // Instance relationships
        resource.relationships.instances?.forEach(instanceId => {
          const edgeId = createUniqueEdgeId(`${resource.id}-${instanceId}`);
          edges.push({
            id: edgeId,
            source: resource.id,
            target: instanceId,
            label: 'Instance',
            type: 'smoothstep',
            style: { stroke: selectedEdge === edgeId ? '#60a5fa' : '#94a3b8' }
          });
        });

        // Volume relationships
        resource.relationships.volumes?.forEach(volumeId => {
          const edgeId = createUniqueEdgeId(`${resource.id}-${volumeId}`);
          edges.push({
            id: edgeId,
            source: resource.id,
            target: volumeId,
            label: 'Volume',
            type: 'smoothstep',
            style: { stroke: selectedEdge === edgeId ? '#60a5fa' : '#94a3b8' }
          });
        });

        // Add CloudFront relationships
        if (resource.relationships.cloudfront) {
          const edgeId = createUniqueEdgeId(`${resource.id}-${resource.relationships.cloudfront}`);
          edges.push({
            id: edgeId,
            source: resource.id,
            target: resource.relationships.cloudfront,
            label: 'CloudFront',
            type: 'smoothstep',
            style: { stroke: selectedEdge === edgeId ? '#60a5fa' : '#94a3b8' }
          });
        }

        // Add ECR to ECS relationships
        if (resource.relationships.repository) {
          const edgeId = createUniqueEdgeId(`${resource.id}-${resource.relationships.repository}`);
          edges.push({
            id: edgeId,
            source: resource.id,
            target: resource.relationships.repository,
            label: 'Container Repository',
            type: 'smoothstep',
            style: { stroke: selectedEdge === edgeId ? '#60a5fa' : '#94a3b8' }
          });
        }

        // Add CloudFront to ALB relationships
        if (resource.relationships.origin) {
          const edgeId = createUniqueEdgeId(`${resource.id}-${resource.relationships.origin}`);
          edges.push({
            id: edgeId,
            source: resource.id,
            target: resource.relationships.origin,
            label: 'Origin',
            type: 'smoothstep',
            style: { stroke: selectedEdge === edgeId ? '#60a5fa' : '#94a3b8' }
          });
        }

        // Add WAF ACL to protected resource relationships
        if (resource.relationships.wafAcl) {
          const edgeId = createUniqueEdgeId(`${resource.id}-${resource.relationships.wafAcl}`);
          edges.push({
            id: edgeId,
            source: resource.id,
            target: resource.relationships.wafAcl,
            label: 'WAF ACL',
            type: 'smoothstep',
            style: { stroke: selectedEdge === edgeId ? '#60a5fa' : '#94a3b8' }
          });
        }

        // Add WAF Rules to ACL relationships
        if (resource.relationships.wafRules) {
          resource.relationships.wafRules.forEach(ruleId => {
            const edgeId = createUniqueEdgeId(`${resource.id}-${ruleId}`);
            edges.push({
              id: edgeId,
              source: resource.id,
              target: ruleId,
              label: 'WAF Rule',
              type: 'smoothstep',
              style: { stroke: selectedEdge === edgeId ? '#60a5fa' : '#94a3b8' }
            });
          });
        }

        // Add WAF to protected resources relationships
        if (resource.relationships.wafAssociations) {
          resource.relationships.wafAssociations.forEach(resourceId => {
            const edgeId = createUniqueEdgeId(`${resource.id}-${resourceId}`);
            edges.push({
              id: edgeId,
              source: resource.id,
              target: resourceId,
              label: 'Protects',
              type: 'smoothstep',
              style: { stroke: selectedEdge === edgeId ? '#60a5fa' : '#94a3b8' }
            });
          });
        }

        // Add protected by WAF relationship
        if (resource.relationships.protectedBy) {
          const edgeId = createUniqueEdgeId(`${resource.relationships.protectedBy}-${resource.id}`);
          edges.push({
            id: edgeId,
            source: resource.relationships.protectedBy,
            target: resource.id,
            label: 'Protected By',
            type: 'smoothstep',
            style: { stroke: selectedEdge === edgeId ? '#60a5fa' : '#94a3b8' }
          });
        }

        // Inside createEdges function, ensure WAF edges are created:
        if (resource.serviceType === 'WAF') {
          // Connect WAF to protected resources
          if (resource.relationships?.wafAssociations) {
            resource.relationships.wafAssociations.forEach(targetId => {
              const edgeId = createUniqueEdgeId(`waf-${resource.id}-${targetId}`);
              edges.push({
                id: edgeId,
                source: resource.id,
                target: targetId,
                label: 'Protects',
                type: 'smoothstep',
                style: { stroke: selectedEdge === edgeId ? '#60a5fa' : '#FF69B4' }
              });
            });
          }

          // Connect WAF rules
          if (resource.relationships?.wafRules) {
            resource.relationships.wafRules.forEach(ruleId => {
              const edgeId = createUniqueEdgeId(`waf-rule-${resource.id}-${ruleId}`);
              edges.push({
                id: edgeId,
                source: resource.id,
                target: ruleId,
                label: 'WAF Rule',
                type: 'smoothstep',
                style: { stroke: selectedEdge === edgeId ? '#60a5fa' : '#FF69B4' }
              });
            });
          }
        }

        // Resources protected by WAF
        if (resource.relationships?.protectedBy) {
          const edgeId = createUniqueEdgeId(`protected-${resource.relationships.protectedBy}-${resource.id}`);
          edges.push({
            id: edgeId,
            source: resource.relationships.protectedBy,
            target: resource.id,
            label: 'Protected By WAF',
            type: 'smoothstep',
            style: { stroke: selectedEdge === edgeId ? '#60a5fa' : '#FF69B4' }
          });
        }
      }
    });
    return edges;
  }, [resources, selectedEdge]);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge.id);
  }, []);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  useEffect(() => {
    setNodes(createNodes());
  }, [layoutSettings, createNodes]);

  useEffect(() => {
    console.log('[Flow] Initial mount with:', {
      ref: ref,
      flowRef: flowRef.current,
      reactFlowInstance: !!reactFlowInstance,
      isInitialized
    });
  }, []);

  useEffect(() => {
    console.log('[Flow] ReactFlow instance changed:', {
      hasInstance: !!reactFlowInstance,
      nodeCount: reactFlowInstance?.getNodes().length
    });
  }, [reactFlowInstance]);

  useEffect(() => {
    console.log('[Flow] Initialization state changed:', {
      isInitialized,
      hasInstance: !!reactFlowInstance
    });
  }, [isInitialized, reactFlowInstance]);

  // Add ref lifecycle debugging
  useEffect(() => {
    console.log('[Flow] Component lifecycle:', {
      phase: 'mount',
      hasRef: !!ref,
      refType: ref ? typeof ref : 'none',
      isObject: ref && typeof ref === 'object',
      isCurrent: ref && typeof ref === 'object' && 'current' in ref,
      currentValue: ref && typeof ref === 'object' && 'current' in ref ? ref.current : 'n/a'
    });

    return () => {
      console.log('[Flow] Component lifecycle: unmounting');
    };
  }, []);

  // Track ref changes
  useEffect(() => {
    console.log('[Flow] Ref changed:', {
      hasRef: !!ref,
      refType: ref ? typeof ref : 'none',
      isObject: ref && typeof ref === 'object',
      isCurrent: ref && typeof ref === 'object' && 'current' in ref,
      currentValue: ref && typeof ref === 'object' && 'current' in ref ? ref.current : 'n/a'
    });
  }, [ref]);

  // Track initialization state
  useEffect(() => {
    console.log('[Flow] Initialization state:', {
      isInitialized,
      hasInstance: !!reactFlowInstance,
      instanceMethods: reactFlowInstance ? Object.keys(reactFlowInstance) : [],
      hasNodes: reactFlowInstance?.getNodes().length > 0
    });
  }, [isInitialized, reactFlowInstance]);

  const onInit = useCallback((instance: any) => {
    console.log('ReactFlow initialized');
    setIsInitialized(true);
    onLoad?.();
  }, [onLoad]);

  useEffect(() => {
    if (reactFlowInstance && !isInitialized) {
      console.log('[Flow] Setting initialized from reactFlowInstance');
      setIsInitialized(true);
    }
  }, [reactFlowInstance, isInitialized]);

  // Memoize edge options
  const defaultEdgeOptions = useMemo(() => ({
    type: 'smoothstep',
    style: { stroke: '#94a3b8', strokeWidth: 9 },
    animated: true,
    markerEnd: standardMarker,
    routing: 'orthogonal',
  }), []);

  return (
    <div 
      ref={flowRef} 
      style={{ 
        width: '2000px', 
        height: '1200px', 
        background: 'rgb(24,24,27)', 
        borderRadius: '16px', 
        overflow: 'hidden' 
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={createEdges()}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onInit={onInit}
        fitView
        fitViewOptions={{ 
          padding: 0.2,
          includeHiddenNodes: true,
          minZoom: 0.1,
          maxZoom: 4
        }}
        minZoom={0.1}
        maxZoom={4}
        onEdgeClick={onEdgeClick}
        defaultEdgeOptions={defaultEdgeOptions}
      >
        <Background color="#333" gap={16} />
        <Controls />
        <MiniMap />
        <Panel position="top-left" className="bg-white/10 p-4 rounded-xl backdrop-blur-lg border border-white/20">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-white text-sm">Layout Type</label>
              <select 
                value={layoutSettings.hierarchyType}
                onChange={(e) => updateLayoutSettings({ hierarchyType: e.target.value as 'layered' | 'grouped' | 'regional' })}
                className="bg-white/10 text-white border border-white/20 rounded px-2 py-1"
              >
                <option value="regional">By Region</option>
                <option value="grouped">By Service</option>
                <option value="layered">Layered</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-white text-sm">Vertical Spacing ({layoutSettings.verticalSpacing}px)</label>
              <input 
                type="range" 
                min="100" 
                max="300" 
                value={layoutSettings.verticalSpacing}
                onChange={(e) => updateLayoutSettings({ verticalSpacing: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-white text-sm">Horizontal Spacing ({layoutSettings.horizontalSpacing}px)</label>
              <input 
                type="range" 
                min="150" 
                max="400" 
                value={layoutSettings.horizontalSpacing}
                onChange={(e) => updateLayoutSettings({ horizontalSpacing: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
});

const ResourceMap = forwardRef<ResourceMapRef, ResourceMapProps>((props, ref) => {
  const flowRef = useRef<ResourceMapRef>(null);

  useEffect(() => {
    console.log('[ResourceMap] Component mounted:', {
      hasRef: !!ref,
      hasFlowRef: !!flowRef.current,
      props: Object.keys(props)
    });
  }, []);

  useImperativeHandle(ref, () => {
    console.log('[ResourceMap] Creating handle:', {
      hasFlowRef: !!flowRef.current,
      methods: flowRef.current ? Object.keys(flowRef.current) : []
    });

    return {
      exportToDrawio: () => {
        console.log('[ResourceMap] exportToDrawio called:', {
          hasFlowRef: !!flowRef.current
        });
        if (!flowRef.current?.exportToDrawio) {
          console.error('[ResourceMap] exportToDrawio not available');
          return;
        }
        flowRef.current.exportToDrawio();
      },
      exportToPng: async () => {
        console.log('[ResourceMap] exportToPng called:', {
          hasFlowRef: !!flowRef.current
        });
        if (!flowRef.current?.exportToPng) {
          console.error('[ResourceMap] exportToPng not available');
          return;
        }
        await flowRef.current.exportToPng();
      }
    };
  }, [flowRef.current]);

  return (
    <ReactFlowProvider>
      <Flow {...props} ref={flowRef} />
    </ReactFlowProvider>
  );
});

ResourceMap.displayName = 'ResourceMap';

export type { ResourceMapRef };
export default ResourceMap; 