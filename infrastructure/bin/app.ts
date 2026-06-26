#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

// Chúng ta sẽ tạo các file này trong thư mục lib/ ở các bước sau
// import { DatabaseStack } from '../lib/database-stack';
// import { AuthStack } from '../lib/auth-stack';

const app = new cdk.App();

// Khởi tạo biến môi trường (Lấy từ tag deploy hoặc mặc định là 'dev')
const envName = app.node.tryGetContext('env') || 'dev';

// Tạm thời comment lại, chúng ta sẽ mở ra khi viết xong code cho từng phần
/*
const databaseStack = new DatabaseStack(app, `MusicStoreDatabaseStack-${envName}`, {
  envName,
});

const authStack = new AuthStack(app, `MusicStoreAuthStack-${envName}`, {
  envName,
});
*/

app.synth();