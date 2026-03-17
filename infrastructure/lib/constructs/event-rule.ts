/**
 * Reusable EventBridge Rule Construct
 */

import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface ScheduledRuleProps {
  ruleName: string;
  schedule: events.Schedule;
  targetQueue?: sqs.Queue;
  targetLambda?: lambda.Function;
  description?: string;
  enabled?: boolean;
}

export class ScheduledRule extends Construct {
  public readonly rule: events.Rule;

  constructor(scope: Construct, id: string, props: ScheduledRuleProps) {
    super(scope, id);

    const { ruleName, schedule, targetQueue, targetLambda, description, enabled = true } = props;

    if (!targetQueue && !targetLambda) {
      throw new Error('Either targetQueue or targetLambda must be provided');
    }

    const targets_: events.IRuleTarget[] = [];
    if (targetQueue) targets_.push(new targets.SqsQueue(targetQueue));
    if (targetLambda) targets_.push(new targets.LambdaFunction(targetLambda));

    this.rule = new events.Rule(this, 'Rule', {
      ruleName,
      schedule,
      description,
      enabled,
      targets: targets_,
    });
  }
}
