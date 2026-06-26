import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Tạo Cognito User Pool (Nơi lưu trữ User)
    this.userPool = new cognito.UserPool(this, 'MusicStoreUserPool', {
      userPoolName: 'MusicStoreUsers',
      selfSignUpEnabled: true,
      signInAliases: { email: true }, // Cho phép đăng nhập bằng email
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Lưu ý: Đổi thành RETAIN khi lên Production thực tế
    });

    // 2. Tạo App Client cho Next.js Frontend
    this.userPoolClient = new cognito.UserPoolClient(this, 'MusicStoreUserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: 'WebClient',
      generateSecret: false, // Frontend (Next.js) public client không dùng secret
    });

    // 3. Xuất giá trị (Outputs) để dùng cho Frontend và API Gateway
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      exportName: 'CognitoUserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      exportName: 'CognitoClientId',
    });
  }
}