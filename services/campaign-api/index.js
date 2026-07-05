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

// services/campaign-api/index.ts
var index_exports = {};
__export(index_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(index_exports);
var import_node_crypto = require("node:crypto");
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var import_client_eventbridge = require("@aws-sdk/client-eventbridge");
var dynamoDb = import_lib_dynamodb.DynamoDBDocumentClient.from(new import_client_dynamodb.DynamoDBClient({}));
var eventBridge = new import_client_eventbridge.EventBridgeClient({});
var tableName = process.env.TABLE_NAME;
var eventBusName = process.env.EVENT_BUS_NAME;
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "OPTIONS,GET,POST",
  "Content-Type": "application/json"
};
var jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body)
});
var handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return jsonResponse(204, {});
  }
  const authorizer = event.requestContext?.authorizer;
  const groups = authorizer?.claims?.["cognito:groups"] || "";
  const isStaff = groups.includes("Admin") || groups.includes("Staff");
  if (!isStaff) {
    return jsonResponse(403, { message: "Forbidden: B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n truy c\u1EADp" });
  }
  if (event.httpMethod === "GET") {
    const result = await dynamoDb.send(
      new import_lib_dynamodb.ScanCommand({
        TableName: tableName,
        FilterExpression: "begins_with(PK, :prefix) AND SK = :metadataSk",
        ExpressionAttributeValues: {
          ":prefix": "CAMPAIGN#",
          ":metadataSk": "METADATA"
        }
      })
    );
    const campaigns = (result.Items ?? []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return jsonResponse(200, campaigns);
  }
  if (event.httpMethod === "POST") {
    if (!event.body) {
      return jsonResponse(400, { message: "Missing request body" });
    }
    const { title, message, channel, segment } = JSON.parse(event.body);
    if (!title || !message) {
      return jsonResponse(400, { message: "Thi\u1EBFu ti\xEAu \u0111\u1EC1 ho\u1EB7c n\u1ED9i dung chi\u1EBFn d\u1ECBch" });
    }
    const campaignId = (0, import_node_crypto.randomUUID)();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const normalizedChannel = channel === "SMS" || channel === "BOTH" ? channel : "EMAIL";
    const campaign = {
      PK: `CAMPAIGN#${campaignId}`,
      SK: "METADATA",
      id: campaignId,
      title,
      message,
      channel: normalizedChannel,
      segment: segment || "ALL",
      status: "QUEUED",
      createdAt: now
    };
    await dynamoDb.send(new import_lib_dynamodb.PutCommand({ TableName: tableName, Item: campaign }));
    if (eventBusName) {
      await eventBridge.send(
        new import_client_eventbridge.PutEventsCommand({
          Entries: [
            {
              EventBusName: eventBusName,
              Source: "com.musicstore.campaign",
              DetailType: "CampaignRequested",
              Detail: JSON.stringify({
                eventId: (0, import_node_crypto.randomUUID)(),
                version: "1.0",
                campaignId,
                title,
                message,
                channel: normalizedChannel,
                segment: campaign.segment
              })
            }
          ]
        })
      );
    }
    return jsonResponse(201, campaign);
  }
  return jsonResponse(405, { message: "Method Not Allowed" });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
