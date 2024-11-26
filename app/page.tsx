'use client';

import { useState } from 'react';
import { 
  EC2Client, DescribeInstancesCommand,
  DescribeVolumesCommand, DescribeSecurityGroupsCommand 
} from '@aws-sdk/client-ec2';
import { 
  S3Client, ListBucketsCommand 
} from '@aws-sdk/client-s3';
import { 
  RDSClient, DescribeDBInstancesCommand 
} from '@aws-sdk/client-rds';
import { 
  IAMClient, ListUsersCommand 
} from '@aws-sdk/client-iam';
import {
  Route53Client, ListHostedZonesCommand, ListResourceRecordSetsCommand
} from '@aws-sdk/client-route-53';
import {
  ECSClient, ListClustersCommand, ListTaskDefinitionsCommand, ListServicesCommand
} from '@aws-sdk/client-ecs';
import { 
  ElasticLoadBalancingV2Client, 
  DescribeLoadBalancersCommand,
  DescribeTargetGroupsCommand,
  DescribeListenersCommand
} from "@aws-sdk/client-elastic-load-balancing-v2";
import dynamic from 'next/dynamic';

import {
  ACMClient,
  ListCertificatesCommand,
  DescribeCertificateCommand
} from "@aws-sdk/client-acm";

const ResourceMap = dynamic(() => import('./components/ResourceMap'), {
  ssr: false
});

interface ResourceLink {
  source: string;
  target: string;
  label?: string;
}

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
  };
}

export default function Home() {
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [resources, setResources] = useState<AWSResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const regions = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-west-1', 'eu-west-2', 'eu-central-1',
    'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1'
  ];

  const groupResourcesByService = (resources: AWSResource[]) => {
    return resources.reduce((acc, resource) => {
      if (!acc[resource.serviceType]) {
        acc[resource.serviceType] = [];
      }
      acc[resource.serviceType].push(resource);
      return acc;
    }, {} as Record<string, AWSResource[]>);
  };

  const scanResources = async () => {
    setLoading(true);
    setError(null);
    setResources([]);
    const discoveredResources: AWSResource[] = [];

    try {
      // Scan each region
      for (const region of regions) {
        // EC2 Resources
        const ec2Client = new EC2Client({
          region,
          credentials: { accessKeyId, secretAccessKey }
        });

        // Get EC2 Instances
        try {
          const instances = await ec2Client.send(new DescribeInstancesCommand({}));
          instances.Reservations?.forEach(reservation => {
            reservation.Instances?.forEach(instance => {
              discoveredResources.push({
                type: 'EC2 Instance',
                serviceType: 'EC2',
                name: instance.Tags?.find(tag => tag.Key === 'Name')?.Value || 'Unnamed',
                id: instance.InstanceId || '',
                region,
                url: `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#InstanceDetails:instanceId=${instance.InstanceId}`
              });
            });
          });
        } catch (err) {
          console.error(`Error scanning EC2 in ${region}:`, err);
        }

        // Get EBS Volumes
        try {
          const volumes = await ec2Client.send(new DescribeVolumesCommand({}));
          volumes.Volumes?.forEach(volume => {
            discoveredResources.push({
              type: 'EBS Volume',
              serviceType: 'EC2',
              name: volume.Tags?.find(tag => tag.Key === 'Name')?.Value || 'Unnamed',
              id: volume.VolumeId || '',
              region,
              url: `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#VolumeDetails:volumeId=${volume.VolumeId}`
            });
          });
        } catch (err) {
          console.error(`Error scanning EBS in ${region}:`, err);
        }

        // Get Security Groups
        try {
          const securityGroups = await ec2Client.send(new DescribeSecurityGroupsCommand({}));
          securityGroups.SecurityGroups?.forEach(sg => {
            discoveredResources.push({
              type: 'Security Group',
              serviceType: 'EC2',
              name: sg.GroupName || '',
              id: sg.GroupId || '',
              region,
              url: `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#SecurityGroup:groupId=${sg.GroupId}`
            });
          });
        } catch (err) {
          console.error(`Error scanning Security Groups in ${region}:`, err);
        }

        // RDS Instances
        const rdsClient = new RDSClient({
          region,
          credentials: { accessKeyId, secretAccessKey }
        });

        try {
          const rdsInstances = await rdsClient.send(new DescribeDBInstancesCommand({}));
          rdsInstances.DBInstances?.forEach(instance => {
            discoveredResources.push({
              type: 'RDS Instance',
              serviceType: 'RDS',
              name: instance.DBInstanceIdentifier || '',
              id: instance.DBInstanceIdentifier || '',
              region,
              url: `https://${region}.console.aws.amazon.com/rds/home?region=${region}#database:id=${instance.DBInstanceIdentifier}`
            });
          });
        } catch (err) {
          console.error(`Error scanning RDS in ${region}:`, err);
        }

        // ECS Resources
        const ecsClient = new ECSClient({
          region,
          credentials: { accessKeyId, secretAccessKey }
        });

        try {
          // Get ECS Clusters
          const clusters = await ecsClient.send(new ListClustersCommand({}));
          for (const clusterArn of clusters.clusterArns || []) {
            discoveredResources.push({
              type: 'ECS Cluster',
              serviceType: 'ECS',
              name: clusterArn.split('/').pop() || '',
              id: clusterArn,
              region,
              url: `https://${region}.console.aws.amazon.com/ecs/home?region=${region}#/clusters/${clusterArn.split('/').pop()}`
            });

            // Get Services for each cluster
            const services = await ecsClient.send(new ListServicesCommand({
              cluster: clusterArn
            }));
            
            services.serviceArns?.forEach(serviceArn => {
              discoveredResources.push({
                type: 'ECS Service',
                serviceType: 'ECS',
                name: serviceArn.split('/').pop() || '',
                id: serviceArn,
                region,
                url: `https://${region}.console.aws.amazon.com/ecs/home?region=${region}#/clusters/${clusterArn.split('/').pop()}/services/${serviceArn.split('/').pop()}`
              });
            });
          }

          // Get Task Definitions
          const taskDefs = await ecsClient.send(new ListTaskDefinitionsCommand({}));
          taskDefs.taskDefinitionArns?.forEach(taskDefArn => {
            discoveredResources.push({
              type: 'ECS Task Definition',
              serviceType: 'ECS',
              name: taskDefArn.split('/').pop() || '',
              id: taskDefArn,
              region,
              url: `https://${region}.console.aws.amazon.com/ecs/home?region=${region}#/taskDefinitions/${taskDefArn.split('/').pop()}`
            });
          });
        } catch (err) {
          console.error(`Error scanning ECS in ${region}:`, err);
        }

        // ALB Resources
        const elbv2Client = new ElasticLoadBalancingV2Client({
          region,
          credentials: { accessKeyId, secretAccessKey }
        });

        try {
          const loadBalancers = await elbv2Client.send(new DescribeLoadBalancersCommand({}));
          
          for (const lb of loadBalancers.LoadBalancers || []) {
            // Get listeners to find certificates
            const listeners = await elbv2Client.send(new DescribeListenersCommand({
              LoadBalancerArn: lb.LoadBalancerArn
            }));

            const certificateArns = listeners.Listeners
              ?.filter(l => l.Certificates && l.Certificates.length > 0)
              .map(l => l.Certificates?.[0].CertificateArn)
              .filter((arn): arn is string => arn !== undefined);

            // Add the load balancer
            discoveredResources.push({
              type: 'Application Load Balancer',
              serviceType: 'ELB',
              name: lb.LoadBalancerName || '',
              id: lb.LoadBalancerArn || '',
              region,
              url: `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#LoadBalancer:loadBalancerArn=${lb.LoadBalancerArn}`,
              relationships: {
                securityGroups: lb.SecurityGroups,
                dnsRecords: [lb.DNSName || ''],
                certificate: certificateArns?.[0]
              }
            });

            // Get target groups for this ALB
            const targetGroups = await elbv2Client.send(new DescribeTargetGroupsCommand({
              LoadBalancerArn: lb.LoadBalancerArn
            }));

            targetGroups.TargetGroups?.forEach(tg => {
              discoveredResources.push({
                type: 'Target Group',
                serviceType: 'ELB',
                name: tg.TargetGroupName || '',
                id: tg.TargetGroupArn || '',
                region,
                url: `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#TargetGroup:targetGroupArn=${tg.TargetGroupArn}`,
                relationships: {
                  loadBalancer: lb.LoadBalancerArn
                }
              });
            });
          }
        } catch (err) {
          console.error(`Error scanning ALB in ${region}:`, err);
        }

        // ACM Certificates (Regional service)
        const acmClient = new ACMClient({
          region,
          credentials: { accessKeyId, secretAccessKey }
        });

        try {
          const certificates = await acmClient.send(new ListCertificatesCommand({}));
          
          for (const certSummary of certificates.CertificateSummaryList || []) {
            // Get detailed certificate info
            const certDetails = await acmClient.send(new DescribeCertificateCommand({
              CertificateArn: certSummary.CertificateArn
            }));
            
            const cert = certDetails.Certificate;
            if (!cert) continue;

            // Find associated ALB
            const linkedALB = discoveredResources.find(r => 
              r.type === 'Application Load Balancer' && 
              cert.InUseBy?.some(arn => arn === r.id)
            );

            discoveredResources.push({
              type: 'ACM Certificate',
              serviceType: 'ACM',
              name: cert.DomainName || '',
              id: cert.CertificateArn || '',
              region,
              url: `https://${region}.console.aws.amazon.com/acm/home?region=${region}#/certificates/${cert.CertificateArn}`,
              relationships: {
                loadBalancer: linkedALB?.id,
                dnsRecords: [cert.DomainName || '', ...(cert.SubjectAlternativeNames || [])]
              }
            });
          }
        } catch (err) {
          console.error(`Error scanning ACM in ${region}:`, err);
        }
      }

      // Route 53 (Global Service)
      const route53Client = new Route53Client({
        region: 'us-east-1',
        credentials: { accessKeyId, secretAccessKey }
      });

      try {
        const hostedZones = await route53Client.send(new ListHostedZonesCommand({}));
        for (const zone of hostedZones.HostedZones || []) {
          discoveredResources.push({
            type: 'Route 53 Hosted Zone',
            serviceType: 'Route 53',
            name: zone.Name || '',
            id: zone.Id || '',
            region: 'global',
            url: `https://console.aws.amazon.com/route53/home#resource-record-sets:${zone.Id}`
          });

          // Get DNS Records for each zone
          const records = await route53Client.send(new ListResourceRecordSetsCommand({
            HostedZoneId: zone.Id
          }));

          records.ResourceRecordSets?.forEach(record => {
            const linkedLoadBalancer = discoveredResources.find(
              r => r.type === 'Application Load Balancer' && 
              r.relationships?.dnsRecords?.includes(record.AliasTarget?.DNSName || '')
            );

            discoveredResources.push({
              type: 'Route 53 Record',
              serviceType: 'Route 53',
              name: record.Name || '',
              id: `${zone.Id}/${record.Name}/${record.Type}`,
              region: 'global',
              url: `https://console.aws.amazon.com/route53/home#resource-record-sets:${zone.Id}`,
              relationships: {
                loadBalancer: linkedLoadBalancer?.id
              }
            });
          });
        }
      } catch (err) {
        console.error('Error scanning Route 53:', err);
      }

      // Global Services (S3, IAM)
      const s3Client = new S3Client({
        region: 'us-east-1',
        credentials: {
          accessKeyId,
          secretAccessKey
        }
      });

      try {
        const buckets = await s3Client.send(new ListBucketsCommand({}));
        buckets.Buckets?.forEach(bucket => {
          discoveredResources.push({
            type: 'S3 Bucket',
            serviceType: 'S3',
            name: bucket.Name || '',
            id: bucket.Name || '',
            region: 'global',
            url: `https://s3.console.aws.amazon.com/s3/buckets/${bucket.Name}`
          });
        });
      } catch (err) {
        console.error('Error scanning S3:', err);
      }

      const iamClient = new IAMClient({
        region: 'us-east-1',
        credentials: {
          accessKeyId,
          secretAccessKey
        }
      });

      try {
        const users = await iamClient.send(new ListUsersCommand({}));
        users.Users?.forEach(user => {
          discoveredResources.push({
            type: 'IAM User',
            serviceType: 'IAM',
            name: user.UserName || '',
            id: user.UserId || '',
            region: 'global',
            url: `https://console.aws.amazon.com/iam/home#/users/${user.UserName}`
          });
        });
      } catch (err) {
        console.error('Error scanning IAM:', err);
      }

      setResources(discoveredResources);
    } catch (err) {
      console.error('Error during scan:', err);
      setError('Failed to scan AWS resources. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const downloadMapHTML = () => {
    const groupedResources = groupResourcesByService(resources);
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AWS Resources Map</title>
        <script src="https://unpkg.com/d3@7.8.5/dist/d3.min.js"></script>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 0;
            background: #1a1a1a;
            color: white;
          }
          #map {
            width: 100vw;
            height: 100vh;
          }
          .node {
            fill: #2a2a2a;
            stroke: #4a4a4a;
            rx: 6;
            ry: 6;
          }
          .node text {
            fill: white;
            text-anchor: middle;
            font-size: 12px;
          }
          .link {
            stroke: #4a4a4a;
            stroke-width: 2px;
          }
          .service-label {
            fill: #6b7280;
            font-size: 14px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <svg id="map"></svg>
        <script>
          const resources = ${JSON.stringify(resources)};
          const width = window.innerWidth;
          const height = window.innerHeight;
          
          const svg = d3.select('#map')
            .attr('width', width)
            .attr('height', height);
            
          const simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id))
            .force('charge', d3.forceManyBody().strength(-1000))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(80));
          
          const nodes = resources.map(r => ({...r}));
          const links = [];
          
          // Create links between resources of the same service
          resources.forEach((source, i) => {
            resources.forEach((target, j) => {
              if (i < j && source.serviceType === target.serviceType) {
                links.push({
                  source: source.id,
                  target: target.id
                });
              }
            });
          });
          
          const link = svg.append('g')
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('class', 'link');
          
          const node = svg.append('g')
            .selectAll('g')
            .data(nodes)
            .join('g');
          
          node.append('rect')
            .attr('class', 'node')
            .attr('width', 160)
            .attr('height', 60)
            .attr('x', -80)
            .attr('y', -30);
          
          node.append('text')
            .attr('dy', '-10')
            .text(d => d.name || d.id);
          
          node.append('text')
            .attr('dy', '10')
            .text(d => d.type);
          
          node.append('text')
            .attr('dy', '30')
            .attr('class', 'service-label')
            .text(d => d.serviceType);
          
          node.append('title')
            .text(d => d.url);
          
          node.on('click', (event, d) => {
            window.open(d.url, '_blank');
          });
          
          simulation
            .nodes(nodes)
            .on('tick', () => {
              link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
              
              node
                .attr('transform', d => \`translate(\${d.x},\${d.y})\`);
            });
          
          simulation.force('link').links(links);
          
          // Add zoom behavior
          const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
              svg.selectAll('g').attr('transform', event.transform);
            });
          
          svg.call(zoom);
        </script>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aws-resources-map-${new Date().toISOString()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadHTML = () => {
    const groupedResources = groupResourcesByService(resources);
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AWS Resources List</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 2rem; 
            line-height: 1.5;
          }
          .service-group { 
            margin-bottom: 2rem; 
          }
          .resource { 
            margin: 1rem 0; 
            padding: 1rem; 
            background: #f5f5f5; 
            border-radius: 4px; 
          }
          h1 { color: #232f3e; }
          h2 { color: #444; }
          .resource-details { margin: 0.5rem 0; }
          a { 
            color: #0073bb;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          .resource-title {
            font-size: 1.17em;
            font-weight: bold;
            margin-bottom: 0.5rem;
          }
        </style>
      </head>
      <body>
        <h1>AWS Resources Report</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
    `;

    Object.entries(groupedResources).forEach(([serviceType, serviceResources]) => {
      html += `
        <div class="service-group">
          <h2>${serviceType}</h2>
      `;

      serviceResources.forEach(resource => {
        html += `
          <div class="resource">
            <div class="resource-title">
              <a href="${resource.url}" target="_blank">${resource.name || resource.id}</a>
            </div>
            <div class="resource-details">
              <p>Type: ${resource.type}</p>
              <p>Region: ${resource.region}</p>
              <p>ID: ${resource.id}</p>
            </div>
          </div>
        `;
      });

      html += `</div>`;
    });

    html += `
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aws-resources-${new Date().toISOString()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const groupedResources = groupResourcesByService(resources);

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">AWS Resource Scanner</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Access Key ID
              </label>
              <input
                type="text"
                value={accessKeyId}
                onChange={(e) => setAccessKeyId(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Access Key ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Secret Access Key
              </label>
              <input
                type="password"
                value={secretAccessKey}
                onChange={(e) => setSecretAccessKey(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Secret Access Key"
              />
            </div>
          </div>
          
          <button
            onClick={scanResources}
            disabled={loading || !accessKeyId || !secretAccessKey}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Scanning...' : 'Scan Resources'}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-8 text-red-500">
            {error}
          </div>
        )}

        {resources.length > 0 && (
          <>
            <div className="mb-4 flex gap-4">
              <button
                onClick={downloadHTML}
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
              >
                Download List Report
              </button>
              <button
                onClick={downloadMapHTML}
                className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600"
              >
                Download Map Report
              </button>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-bold mb-4">Resource Map</h2>
              <ResourceMap resources={resources} />
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Discovered Resources</h2>
              
              {Object.entries(groupedResources).map(([serviceType, serviceResources]) => (
                <div key={serviceType} className="mb-8">
                  <h3 className="text-xl font-semibold mb-4 text-blue-400">{serviceType}</h3>
                  <div className="grid gap-4">
                    {serviceResources.map((resource, index) => (
                      <div
                        key={index}
                        className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-lg">{resource.name}</h3>
                            <p className="text-gray-400 text-sm">Type: {resource.type}</p>
                            <p className="text-gray-400 text-sm">Region: {resource.region}</p>
                            <p className="text-gray-400 text-sm">ID: {resource.id}</p>
                          </div>
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600"
                          >
                            View in Console
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
