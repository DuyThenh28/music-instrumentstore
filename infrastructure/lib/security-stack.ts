// Đường dẫn: infra/lib/security-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as guardduty from 'aws-cdk-lib/aws-guardduty';

export class SecurityStack extends cdk.Stack {
  public readonly stripeSecrets: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Khởi tạo Két sắt lưu trữ Stripe Keys
    this.stripeSecrets = new secretsmanager.Secret(this, 'StripeSecrets', {
      secretName: 'ecommerce/stripe-credentials',
      description: 'Stripe Secret Key and Webhook Endpoint Secret',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          STRIPE_SECRET_KEY: 'TO_BE_REPLACED_IN_CONSOLE',
          STRIPE_WEBHOOK_SECRET: 'TO_BE_REPLACED_IN_CONSOLE'
        }),
        generateStringKey: 'dummy', 
      },
    });

    // Output để các Stack khác (như ApiStack) có thể lấy ARN và cấp quyền cho Lambda
    new cdk.CfnOutput(this, 'StripeSecretsArn', {
      value: this.stripeSecrets.secretArn,
      exportName: 'StripeSecretsArn',
    });

    // 2. Cấu hình CloudTrail cho audit logs
    // Tạo S3 bucket bảo mật cao cho CloudTrail logs
    const auditBucket = new s3.Bucket(this, 'MusicStoreAuditBucket', {
      bucketName: `musicstore-audit-logs-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Để phát triển dễ dàng, đổi sang RETAIN khi lên production
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          id: 'ArchiveToGlacierAndExpire',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
          expiration: cdk.Duration.days(365),
        },
      ],
    });

    // Tạo CloudTrail trail
    new cloudtrail.Trail(this, 'MusicStoreCloudTrail', {
      bucket: auditBucket,
      trailName: 'MusicStoreAuditTrail',
      sendToCloudWatchLogs: true, // Gửi về CloudWatch Logs để giám sát real-time
    });

    // 3. Cấu hình GuardDuty cho threat detection
    new guardduty.CfnDetector(this, 'MusicStoreGuardDuty', {
      enable: true,
      findingPublishingFrequency: 'FIFTEEN_MINUTES',
    });
  }
}