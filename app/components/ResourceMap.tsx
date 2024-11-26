'use client';

import { useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  Position,
  MarkerType,
} from 'reactflow';
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

export default function ResourceMap({ resources }: ResourceMapProps) {
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
              className="text-xs cursor-pointer" 
              onClick={() => window.open(resource.url, '_blank')}
            >
              <div className="font-bold">{resource.name || resource.id}</div>
              <div>{resource.type}</div>
              <div className="text-gray-500">{resource.region}</div>
            </div>
          ),
        },
        position: { x: pos.x, y: pos.y + (pos.count * 150) },
        style: {
          background: serviceColors[resource.serviceType as keyof typeof serviceColors] || 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '10px',
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

      // Route 53 connections
      if (resource.type === 'Route 53 Record' && resource.relationships?.loadBalancer) {
        const edgeId = `${resource.id}-${resource.relationships.loadBalancer}-dns`;
        edges.push({
          id: edgeId,
          source: resource.id,
          target: resource.relationships.loadBalancer,
          label: 'DNS Alias',
          type: 'smoothstep',
          animated: true,
          markerEnd: { type: MarkerType.Arrow },
          style: { stroke: '#666' },
        });
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
    <div style={{ width: '100%', height: '600px', background: 'white' }}>
      <ReactFlow
        nodes={createNodes()}
        edges={createEdges()}
        fitView
        minZoom={0.1}
        maxZoom={4}
      >
        <Background color="#666666" />
        <Controls />
        <MiniMap style={{ background: 'white' }} />
      </ReactFlow>
    </div>
  );
} 