import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export interface AuthStackProps extends cdk.StackProps {
  productsTable: dynamodb.Table;
}

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
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

    // 1b. Cognito Lambda Trigger: tuỳ biến nội dung email OTP (đăng ký / quên mật khẩu)
    const customMessageFn = new lambda.Function(this, 'CustomMessageTriggerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../services/auth-triggers'),
      logRetention: logs.RetentionDays.ONE_WEEK,
    });
    this.userPool.addTrigger(cognito.UserPoolOperation.CUSTOM_MESSAGE, customMessageFn);

    // 1c. Cognito Lambda Trigger: tự tạo bản ghi PROFILE trong DynamoDB ngay khi xác nhận đăng ký
    const postConfirmationFn = new lambda.Function(this, 'PostConfirmationTriggerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../services/auth-post-confirmation'),
      environment: {
        TABLE_NAME: props.productsTable.tableName,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });
    props.productsTable.grantWriteData(postConfirmationFn);
    this.userPool.addTrigger(cognito.UserPoolOperation.POST_CONFIRMATION, postConfirmationFn);

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