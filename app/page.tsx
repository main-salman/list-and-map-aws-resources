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

interface AWSResource {
  type: string;
  serviceType: string;
  name: string;
  id: string;
  region: string;
  url: string;
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

  const downloadHTML = () => {
    const groupedResources = groupResourcesByService(resources);
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AWS Resources Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 2rem; }
          .service-group { margin-bottom: 2rem; }
          .resource { margin: 1rem 0; padding: 1rem; background: #f5f5f5; border-radius: 4px; }
          h1 { color: #232f3e; }
          h2 { color: #444; }
          .resource-details { margin: 0.5rem 0; }
          a { color: #0073bb; }
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
            <h3>${resource.name || resource.id}</h3>
            <div class="resource-details">
              <p>Type: ${resource.type}</p>
              <p>Region: ${resource.region}</p>
              <p>ID: ${resource.id}</p>
              <p><a href="${resource.url}" target="_blank">View in Console</a></p>
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
            discoveredResources.push({
              type: 'Route 53 Record',
              serviceType: 'Route 53',
              name: record.Name || '',
              id: `${zone.Id}/${record.Name}/${record.Type}`,
              region: 'global',
              url: `https://console.aws.amazon.com/route53/home#resource-record-sets:${zone.Id}`
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
            <div className="mb-4">
              <button
                onClick={downloadHTML}
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
              >
                Download Report
              </button>
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
