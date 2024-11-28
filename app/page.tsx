'use client';

import { useState, useRef } from 'react';
import { 
  EC2Client, DescribeInstancesCommand,
  DescribeVolumesCommand, DescribeSecurityGroupsCommand,
  DescribeNatGatewaysCommand,
  DescribeInternetGatewaysCommand,
  DescribeRouteTablesCommand
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
  ECSClient, ListClustersCommand, ListServicesCommand, DescribeServicesCommand
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

import {
  ECRClient,
  DescribeRepositoriesCommand
} from '@aws-sdk/client-ecr';

import {
  EventBridgeClient,
  ListRulesCommand
} from '@aws-sdk/client-eventbridge';

import {
  LambdaClient,
  ListFunctionsCommand
} from '@aws-sdk/client-lambda';

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
    volumes?: string[];
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
                url: `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#InstanceDetails:instanceId=${instance.InstanceId}`,
                relationships: {
                  volumes: instance.BlockDeviceMappings?.map(vol => vol.Ebs?.VolumeId).filter(Boolean) as string[]
                }
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
            
            // Use Promise.all to handle async operations in forEach
            await Promise.all(services.serviceArns?.map(async (serviceArn) => {
              // Get the service details to check for volumes
              const serviceDetails = await ecsClient.send(new DescribeServicesCommand({
                cluster: clusterArn,
                services: [serviceArn]
              }));

              const service = serviceDetails.services?.[0];
              if (!service) return;

              discoveredResources.push({
                type: 'ECS Service',
                serviceType: 'ECS',
                name: serviceArn.split('/').pop() || '',
                id: serviceArn,
                region,
                url: `https://${region}.console.aws.amazon.com/ecs/home?region=${region}#/clusters/${clusterArn.split('/').pop()}/services/${serviceArn.split('/').pop()}`,
                relationships: {
                  volumes: service.volumes?.map(vol => vol.name).filter(Boolean) as string[]
                }
              });
            }) || []);
          }
        } catch (err) {
          console.error(`Error scanning ECS in ${region}:`, err);
        }

        // ALB/ELB Resources
        const elbv2Client = new ElasticLoadBalancingV2Client({
          region,
          credentials: { accessKeyId, secretAccessKey }
        });

        try {
          const loadBalancers = await elbv2Client.send(new DescribeLoadBalancersCommand({}));
          
          for (const lb of loadBalancers.LoadBalancers || []) {
            // Get listeners
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

            // Add listeners
            listeners.Listeners?.forEach(listener => {
              discoveredResources.push({
                type: 'ELB Listener',
                serviceType: 'ELB',
                name: `${lb.LoadBalancerName}-${listener.Port}`,
                id: listener.ListenerArn || '',
                region,
                url: `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#LoadBalancer:loadBalancerArn=${lb.LoadBalancerArn}`,
                relationships: {
                  loadBalancer: lb.LoadBalancerArn
                }
              });
            });

            // Get target groups
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
          console.error(`Error scanning ELB in ${region}:`, err);
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

        // NAT Gateways
        try {
          const natGateways = await ec2Client.send(new DescribeNatGatewaysCommand({}));
          natGateways.NatGateways?.forEach(nat => {
            discoveredResources.push({
              type: 'NAT Gateway',
              serviceType: 'EC2',
              name: nat.Tags?.find(tag => tag.Key === 'Name')?.Value || nat.NatGatewayId || '',
              id: nat.NatGatewayId || '',
              region,
              url: `https://${region}.console.aws.amazon.com/vpc/home?region=${region}#NatGatewayDetails:natGatewayId=${nat.NatGatewayId}`
            });
          });
        } catch (err) {
          console.error(`Error scanning NAT Gateways in ${region}:`, err);
        }

        // Internet Gateways
        try {
          const igws = await ec2Client.send(new DescribeInternetGatewaysCommand({}));
          igws.InternetGateways?.forEach(igw => {
            discoveredResources.push({
              type: 'Internet Gateway',
              serviceType: 'EC2',
              name: igw.Tags?.find(tag => tag.Key === 'Name')?.Value || igw.InternetGatewayId || '',
              id: igw.InternetGatewayId || '',
              region,
              url: `https://${region}.console.aws.amazon.com/vpc/home?region=${region}#InternetGateway:internetGatewayId=${igw.InternetGatewayId}`
            });
          });
        } catch (err) {
          console.error(`Error scanning Internet Gateways in ${region}:`, err);
        }

        // ECR Repositories
        const ecrClient = new ECRClient({
          region,
          credentials: { accessKeyId, secretAccessKey }
        });

        try {
          const repositories = await ecrClient.send(new DescribeRepositoriesCommand({}));
          repositories.repositories?.forEach(repo => {
            discoveredResources.push({
              type: 'ECR Repository',
              serviceType: 'ECR',
              name: repo.repositoryName || '',
              id: repo.repositoryArn || '',
              region,
              url: `https://${region}.console.aws.amazon.com/ecr/repositories/${repo.repositoryName}`
            });
          });
        } catch (err) {
          console.error(`Error scanning ECR in ${region}:`, err);
        }

        // EventBridge Rules
        const eventBridgeClient = new EventBridgeClient({
          region,
          credentials: { accessKeyId, secretAccessKey }
        });

        try {
          const rules = await eventBridgeClient.send(new ListRulesCommand({}));
          rules.Rules?.forEach(rule => {
            discoveredResources.push({
              type: 'EventBridge Rule',
              serviceType: 'EventBridge',
              name: rule.Name || '',
              id: rule.Arn || '',
              region,
              url: `https://${region}.console.aws.amazon.com/events/home?region=${region}#/rules/${rule.Name}`
            });
          });
        } catch (err) {
          console.error(`Error scanning EventBridge in ${region}:`, err);
        }

        // Lambda Functions
        const lambdaClient = new LambdaClient({
          region,
          credentials: { accessKeyId, secretAccessKey }
        });

        try {
          const functions = await lambdaClient.send(new ListFunctionsCommand({}));
          functions.Functions?.forEach(func => {
            discoveredResources.push({
              type: 'Lambda Function',
              serviceType: 'Lambda',
              name: func.FunctionName || '',
              id: func.FunctionArn || '',
              region,
              url: `https://${region}.console.aws.amazon.com/lambda/home?region=${region}#/functions/${func.FunctionName}`
            });
          });
        } catch (err) {
          console.error(`Error scanning Lambda in ${region}:`, err);
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
    <main className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
      <div className="container mx-auto flex flex-col items-center justify-center px-4 py-24">
        <div className="text-center max-w-4xl mx-auto mb-24 relative">
          <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-blue-500/30 to-purple-500/30 -z-10"></div>
          <h1 className="text-7xl font-bold mb-8 tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
            AWS Resource Scanner
          </h1>
          <p className="text-2xl text-blue-200 font-light">
            Visualize and explore your AWS infrastructure with an elegant, interactive map
          </p>
        </div>
        
        <div className="w-full max-w-xl bg-white/10 rounded-3xl p-10 mb-12 backdrop-blur-2xl border border-white/20 shadow-[0_0_60px_-15px_rgba(0,0,0,0.5)]">
          <div className="space-y-8 mb-8">
            <div>
              <label className="block text-lg font-medium mb-3 text-blue-200 text-center">
                Access Key ID
              </label>
              <input
                type="text"
                value={accessKeyId}
                onChange={(e) => setAccessKeyId(e.target.value)}
                className="w-full px-6 py-4 bg-white/5 rounded-2xl border-2 border-white/10 focus:border-blue-400 focus:ring-0 transition-all text-center text-lg placeholder:text-white/30"
                placeholder="Enter Access Key ID"
              />
            </div>
            <div>
              <label className="block text-lg font-medium mb-3 text-blue-200 text-center">
                Secret Access Key
              </label>
              <input
                type="password"
                value={secretAccessKey}
                onChange={(e) => setSecretAccessKey(e.target.value)}
                className="w-full px-6 py-4 bg-white/5 rounded-2xl border-2 border-white/10 focus:border-blue-400 focus:ring-0 transition-all text-center text-lg placeholder:text-white/30"
                placeholder="Enter Secret Access Key"
              />
            </div>
          </div>
          
          <button
            onClick={scanResources}
            disabled={loading || !accessKeyId || !secretAccessKey}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-5 px-8 rounded-2xl font-semibold text-lg
                     disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300
                     shadow-[0_10px_40px_-15px_rgba(79,70,229,0.5)] hover:shadow-[0_20px_60px_-15px_rgba(79,70,229,0.5)]
                     hover:translate-y-[-2px] active:translate-y-[1px]"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Scanning...
              </span>
            ) : 'Scan Resources'}
          </button>
        </div>

        {error && (
          <div className="max-w-xl mx-auto bg-red-500/20 border-2 border-red-500/30 rounded-2xl p-6 mb-12 backdrop-blur-xl text-red-200 text-center font-medium">
            {error}
          </div>
        )}

        {resources.length > 0 && (
          <>
            <div className="mb-12 flex gap-4 justify-center">
              <button
                onClick={downloadHTML}
                className="px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300
                         bg-gradient-to-r from-purple-500 to-pink-500 
                         shadow-[0_10px_40px_-15px_rgba(168,85,247,0.5)] hover:shadow-[0_20px_60px_-15px_rgba(168,85,247,0.5)]
                         hover:translate-y-[-2px] active:translate-y-[1px]"
              >
                <span className="flex items-center gap-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                  Download Report
                </span>
              </button>
            </div>

            <div className="w-full bg-white/10 rounded-3xl p-10 mb-12 backdrop-blur-2xl border border-white/20 shadow-[0_0_60px_-15px_rgba(0,0,0,0.5)]">
              <h2 className="text-4xl font-bold mb-10 bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
                Resource Map
              </h2>
              <ResourceMap resources={resources} />
            </div>

            <div className="w-full bg-white/10 rounded-3xl p-10 backdrop-blur-2xl border border-white/20 shadow-[0_0_60px_-15px_rgba(0,0,0,0.5)]">
              <h2 className="text-4xl font-bold mb-10 bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
                Discovered Resources
              </h2>
              
              {Object.entries(groupedResources).map(([serviceType, serviceResources]) => (
                <div key={serviceType} className="mb-12 last:mb-0">
                  <h3 className="text-2xl font-semibold mb-6 text-blue-300">{serviceType}</h3>
                  <div className="grid gap-6">
                    {serviceResources.map((resource, index) => (
                      <div
                        key={index}
                        className="bg-white/5 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 border border-white/10
                                 hover:border-white/20 hover:shadow-[0_10px_40px_-15px_rgba(0,0,0,0.3)]"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-xl mb-3 text-blue-200">{resource.name}</h4>
                            <p className="text-blue-200/80 text-base mb-2">Type: {resource.type}</p>
                            <p className="text-blue-200/80 text-base mb-2">Region: {resource.region}</p>
                            <p className="text-blue-200/80 text-base">ID: {resource.id}</p>
                          </div>
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl text-base font-semibold
                                     transition-all duration-300 hover:translate-y-[-2px] active:translate-y-[1px]
                                     shadow-[0_10px_40px_-15px_rgba(79,70,229,0.5)] hover:shadow-[0_20px_60px_-15px_rgba(79,70,229,0.5)]"
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
