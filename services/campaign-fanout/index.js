var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// services/campaign-fanout/index.ts
var index_exports = {};
__export(index_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(index_exports);
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var import_client_sqs = require("@aws-sdk/client-sqs");
var dynamoDb = import_lib_dynamodb.DynamoDBDocumentClient.from(new import_client_dynamodb.DynamoDBClient({}));
var sqs = new import_client_sqs.SQSClient({});
var tableName = process.env.TABLE_NAME;
var campaignQueueUrl = process.env.CAMPAIGN_QUEUE_URL;
var BATCH_SIZE = 10;
var handler = async (event) => {
  const detail = event.detail || event;
  const { campaignId, title, message, channel, segment } = detail;
  console.log(`[CampaignFanOut] B\u1EAFt \u0111\u1EA7u fan-out chi\u1EBFn d\u1ECBch ${campaignId} (segment=${segment})`);
  const recipients = await collectRecipients();
  console.log(`[CampaignFanOut] T\xECm \u0111\u01B0\u1EE3c ${recipients.length} kh\xE1ch h\xE0ng (\u0111\xE3 lo\u1EA1i tr\xF9ng, lo\u1EA1i opt-out)`);
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    await sqs.send(
      new import_client_sqs.SendMessageBatchCommand({
        QueueUrl: campaignQueueUrl,
        Entries: batch.map((recipient, idx) => ({
          Id: `${campaignId}-${i + idx}`,
          MessageBody: JSON.stringify({ campaignId, title, message, channel, recipient })
        }))
      })
    );
  }
  console.log(`[CampaignFanOut] \u0110\xE3 \u0111\u1EA9y ${recipients.length} message v\xE0o Campaign Queue cho chi\u1EBFn d\u1ECBch ${campaignId}`);
};
async function collectRecipients() {
  const seen = /* @__PURE__ */ new Set();
  const recipients = [];
  let ExclusiveStartKey;
  do {
    const result = await dynamoDb.send(
      new import_lib_dynamodb.ScanCommand({
        TableName: tableName,
        FilterExpression: "begins_with(PK, :orderPrefix) AND SK = :metadataSk",
        ExpressionAttributeValues: {
          ":orderPrefix": "ORDER#",
          ":metadataSk": "METADATA"
        },
        ExclusiveStartKey
      })
    );
    for (const item of result.Items ?? []) {
      const email = item.email;
      const phone = item.customer?.phone;
      const optOut = item.customer?.marketingOptOut === true;
      if (optOut) continue;
      const key = email || phone;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      recipients.push({ email, phone });
    }
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return recipients;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
