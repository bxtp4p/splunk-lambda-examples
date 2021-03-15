const signalFxLambda = require('signalfx-lambda');
const tracing = require('signalfx-lambda/tracing');

const tracer = tracing.tracer();

exports.handler = signalFxLambda.asyncWrapper(async (event) => {
    console.log(event);

    //Access the active span that is created automatically and set a tag and value
    let currentSpan = tracer.scope().active();
    currentSpan.setTag("foo", "bar");

    //Create a child span
    let childSpan = tracer.startSpan("child-span", {
        childOf: currentSpan.context()
    });

    childSpan.setTag("bar", "foo");
    
    const response = await new Promise(resolve => {
        setTimeout((message) => {
            resolve({
                statusCode: 200,
                body: JSON.stringify(message)
            });
        }, 
        //hard-coded delay (1s)
        1000, 
        "Hello NodeJS from Lambda");
    });    
    childSpan.finish();

    return response;
});
