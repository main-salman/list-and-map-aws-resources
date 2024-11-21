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

interface AWSResource {
  type: string;
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
          credentials: {
            accessKeyId,
            secretAccessKey
          }
        });

        // Get EC2 Instances
        try {
          const instances = await ec2Client.send(new DescribeInstancesCommand({}));
          instances.Reservations?.forEach(reservation => {
            reservation.Instances?.forEach(instance => {
              discoveredResources.push({
                type: 'EC2 Instance',
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
          credentials: {
            accessKeyId,
            secretAccessKey
          }
        });

        try {
          const rdsInstances = await rdsClient.send(new DescribeDBInstancesCommand({}));
          rdsInstances.DBInstances?.forEach(instance => {
            discoveredResources.push({
              type: 'RDS Instance',
              name: instance.DBInstanceIdentifier || '',
              id: instance.DBInstanceIdentifier || '',
              region,
              url: `https://${region}.console.aws.amazon.com/rds/home?region=${region}#database:id=${instance.DBInstanceIdentifier}`
            });
          });
        } catch (err) {
          console.error(`Error scanning RDS in ${region}:`, err);
        }
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
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Discovered Resources</h2>
            <div className="grid gap-4">
              {resources.map((resource, index) => (
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
        )}
      </div>
    </main>
  );
}
