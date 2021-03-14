//add the wrapper
const signalFxLambda = require('signalfx-lambda');

//add tracing to be able to create a span or access the current span
const tracing = require("signalfx-lambda/tracing");
const opentracing = require("opentracing");

exports.handler = signalFxLambda.asyncWrapper(async (event, context) => {
    //reference to the current tracer
    const tracer = tracing.tracer();
    const current_span = tracer.scope().active();
    
    //Set the environment tag for this span
    current_span.setTag('environment', process.env.ENVIRONMENT_NAME);
    
    //if the trace id is in the event, use it to correlate this to the parent span
    if (event.headers && event.headers['x-b3-traceid']) {
        current_span.setTag('x-b3-traceid', event.headers['x-b3-traceid']);
        delete event.headers;
    }
    
    //if testing through AWS lambda ui, event == data; otherwise, it will be in the `body` field of the event
    let data = event.body ? event.body : event;
    
    current_span.setTag('customer', data.customer);
    current_span.setTag('customer_environment', data.customer_environment);
    
    //Send custom event
    signalFxLambda.helper.sendCustomEvent(
        'NodeJsLambdaExampleEvent', 
        {
            functionName: context.functionName,
            ...data
        }, 
        {   description: 'Child function executed.' }
    );
    
    const response = {
        statusCode: 200,
        body: JSON.stringify('Called with: ' + JSON.stringify(event))
    };
    
    return response;
});
