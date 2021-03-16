const AWS = require('aws-sdk');
const lambda = new AWS.Lambda();
//add the wrapper
const signalFxLambda = require('signalfx-lambda');

//add tracing to be able to create a span or access the current span
const tracing = require("signalfx-lambda/tracing");

//wrap the handler function with the signalfx wrapper function
exports.handler = signalFxLambda.asyncWrapper(async (event, context) => {
    console.log(event);
    let eventData = event.body ? JSON.parse(event.body) : event;
    
    //get a tracer
    const tracer = tracing.tracer();
    
    //reference to the current span
    const current_span = tracer.scope().active();
    
    //Add tags, including environment tag
    current_span.setTag('environment', process.env.ENVIRONMENT_NAME);
    current_span.setTag('customer', eventData.customer);
    current_span.setTag('customer_environment', eventData.customer_environment);
    
    //Metrics
    //1: Counter example
    signalFxLambda.helper.sendCounter('demo.lambda.database_calls', 1, eventData);
    
    //2: Gauge example
    signalFxLambda.helper.sendGauge('demo.lambda.application_performance', getRandomInt(100), eventData);
    
    //Events
    signalFxLambda.helper.sendCustomEvent(
        'NodeJsLambdaExampleEvent', 
        {
            functionName: context.functionName,
            ...eventData
        }, 
        {   description: 'Parent function executed.' }
    );
    
    //This is for setting up context propagation; will inject x-b3-* headers
    eventData.headers = {};
    tracing.inject(eventData.headers);
    
    let response = {
        statusCode: 200,
        message: '',
        headers: {
            "Server-Timing": getServerTraceContext(eventData)
        }
    }
    
    //Call second function
    await invokeSecondFn(eventData).then(resolved => {
        response.message = resolved.Payload ? resolved.Payload : 'completed';
    }, rejected => {
        response.statusCode = 500;
        response.message = 'Error occurred: ' + JSON.stringify(rejected);
    });
    
    return response;
});

const invokeSecondFn = async data => {
    
    const params = {
        FunctionName: process.env.CHILD_FUNCTION_ARN,
        LogType: 'Tail',
        InvocationType: 'Event',
        Payload: JSON.stringify(data)
    };
    
    
        
    return lambda.invoke(params).promise();
}

const getRandomInt = max => {
    return Math.floor(Math.random() * Math.floor(max));
}

//This is for sending to RUM Beta (will not be needed in the future)
const getServerTraceContext = eventData => {
    //docs: https://github.com/signalfx/splunk-otel-js-browser/blob/main/docs/ServerTraceContext.md
    const traceId = eventData.headers['x-b3-traceid'];
    const parentId = eventData.headers['x-b3-spanid'];
    
    return `00-${traceId}-${parentId}-01`;
}