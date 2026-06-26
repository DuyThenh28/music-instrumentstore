import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class DatabaseStack extends cdk.Stack {
  public readonly mainTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Khởi tạo DynamoDB Single Table
    this.mainTable = new dynamodb.Table(this, 'MusicStoreMainTable', {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // Tối ưu chi phí serverless
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Xóa table khi destroy stack (chỉ dùng cho Dev)
    });

    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: this.mainTable.tableName,
      exportName: 'MainTableName',
    });
  }
}