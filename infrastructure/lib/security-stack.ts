// Đường dẫn: infra/lib/security-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

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
  }
}