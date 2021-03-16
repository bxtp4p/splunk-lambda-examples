import json
import os
import signalfx_lambda
import opentracing

ENVIRONMENT_NAME = os.environ["ENVIRONMENT_NAME"]

# @signalfx_lambda.emits_metrics()
@signalfx_lambda.is_traced()
def lambda_handler(event, context):
    # opentracing.tracer must be referenced from within
    # a function decorated with the is_traced() decorator
    # or it'll not reference the correct tracer initialized
    # for the lambda function.
    tracer = opentracing.tracer
    tracer.active_span.set_tag("environment", ENVIRONMENT_NAME)
    
    with tracer.start_active_span("notification-received") as scope:
        span = scope.span
        
        span.set_tag("environment", ENVIRONMENT_NAME)
        span.set_tag("foo", "bar")

    # signalfx_lambda.send_counter('demo.webhook.notification.count', 1)

    return {
        "statusCode": 200,
        "body": json.dumps(event)
    }
