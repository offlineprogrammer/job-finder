/**
 * EventBridge client wrapper
 */

import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const client = new EventBridgeClient({});

export interface EventDetail {
  [key: string]: unknown;
}

export async function putEvent(
  source: string,
  detailType: string,
  detail: EventDetail
): Promise<void> {
  const command = new PutEventsCommand({
    Entries: [
      {
        Source: source,
        DetailType: detailType,
        Detail: JSON.stringify(detail),
      },
    ],
  });

  await client.send(command);
}
