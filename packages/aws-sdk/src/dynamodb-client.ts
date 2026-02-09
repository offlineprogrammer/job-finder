/**
 * DynamoDB client wrapper
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
export const dynamoDocClient = DynamoDBDocumentClient.from(client);

export { GetCommand, PutCommand, QueryCommand, DeleteCommand, BatchWriteCommand };
