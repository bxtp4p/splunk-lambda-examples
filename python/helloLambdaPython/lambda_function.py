import json
import signalfx_lambda
import opentracing
import os


@signalfx_lambda.emits_metrics()
@signalfx_lambda.is_traced()
def lambda_handler(event, context):
    # opentracing.tracer must be referenced from within
    # a function decorated with the is_traced() decorator
    # or it'll not reference the correct tracer initialized
    # for the lambda function.
    tracer = opentracing.tracer
    tags = {
            'environment': os.environ['ENVIRONMENT_NAME'], 
            'key1': event['key1'], 
            'key2': event['key2'], 
            'key3': event['key3']
            
    }
    
    with tracer.start_active_span("demo_span", tags=tags) as scope:
        #print("Received event: " + json.dumps(event, indent=2))
        print("value1 = " + event['key1'])
        print("value2 = " + event['key2'])
        print("value3 = " + event['key3'])
        
        # sending application_performance metric with value 100 and dimension abc:def
        signalfx_lambda.send_gauge('application_performance', 100, tags)
    
        # sending counter metric with no dimension
        signalfx_lambda.send_counter('database_calls', 1)
    
    return event['key1'] + " " + event['key2'] + " " + event['key3']
    
