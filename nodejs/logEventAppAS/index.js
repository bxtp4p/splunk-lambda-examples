"use strict";

const signalFxLambda = require('signalfx-lambda');
const tracing = require("signalfx-lambda/tracing");

const operations = {
    EVENT_ADDED: 'event-added',
    EVENT_DELETED: 'event-deleted',
    COMMENT_ADDED: 'comment-added'
}

const span_keys = {
    APP_OPERATION: 'app_operation',
    APP_EVENT_ID: 'app_event_id',
    APP_COMMENT_ID: 'app_comment_id',
}

exports.handler = signalFxLambda.asyncWrapper(async (event) => {

    //get the server-timing header (for RUM Beta)
    const traceContextHeaderValue = getServerTimingHeaderValue();
    
    //this is the response object we are going to send back
    let response = {
        statusCode: 200 ,
        message: `Received data: ${JSON.stringify(event)}`,
        headers: {
            'Server-Timing': `'${traceContextHeaderValue}'`
        }
    };
    
    //get the tracer
    const tracer = tracing.tracer();
    
    //get the current span
    const current_span = tracer.scope().active();
    
    //set the environment tag so that it shows up in the right app in APM dashboard
    const ENVIRONMENT_NAME = process.env.ENVIRONMENT_NAME;
    current_span.setTag('environment', ENVIRONMENT_NAME);
    
    if (event.data) {
        let data = event.data;
        
        //New Event Created
        if(data.createEvent) {
            //Add a couple of tags to the span
            current_span.setTag(span_keys.APP_OPERATION, operations.EVENT_ADDED);
            current_span.setTag(span_keys.APP_EVENT_ID, data.createEvent.id);
            
            
            //Send metric to SFx
            signalFxLambda.helper.sendCounter('demo.trans.eventcreated.count', 1, {
                'environment': ENVIRONMENT_NAME
            });
            
            //Send custom event to SFx
            signalFxLambda.helper.sendCustomEvent(
                'demo.trans.eventcreated.event', 
                getEventDetails(data.createEvent) , {
                    'description': `New Event Created: ${data.createEvent.name}` 
                }
            );
            
            response.message = 'Logged new "Event Created" metric and event';
        }
        
        //Event Deleted
        else if (data.deleteEvent) {
            current_span.setTag(span_keys.APP_OPERATION, operations.EVENT_DELETED);
            current_span.setTag(span_keys.APP_EVENT_ID, data.deleteEvent.id);
            
            signalFxLambda.helper.sendCounter('demo.trans.eventdeleted.count', 1, {
                'environment': ENVIRONMENT_NAME
            });
            
            signalFxLambda.helper.sendCustomEvent(
                'demo.trans.eventdeleted.event', 
                getEventDetails(data.deleteEvent), {
                    'description': `Event Deleted: ${data.deleteEvent.name}` 
                }
            );
            
            response.message = 'Logged "Event Deleted" metric and event';
            
        }
        
        //Comment Added
        else if (data.commentOnEvent) {
            current_span.setTag(span_keys.APP_OPERATION, operations.COMMENT_ADDED);
            current_span.setTag(span_keys.APP_EVENT_ID, data.commentOnEvent.eventId);
            current_span.setTag(span_keys.APP_COMMENT_ID, data.commentOnEvent.commentId);
            
            signalFxLambda.helper.sendCounter('demo.trans.commentadded.count', 1, {
                'environment': ENVIRONMENT_NAME
            });
            
            signalFxLambda.helper.sendCustomEvent(
                'demo.trans.commentadded.event', 
                data.commentOnEvent, {
                    'description': `Event comment added` 
                }
            );
            
            response.message = 'Logged "Comment Added" metric and event';
        }
    }
    
    console.log(response);
    return response;
});


const getServerTimingHeaderValue = () => {
    //docs: https://github.com/signalfx/splunk-otel-js-browser/blob/main/docs/ServerTraceContext.md
    
    let headers = {};
    
    tracing.inject(headers);
    const traceId = headers['x-b3-traceid'].padStart(32, "0");
    const parentId = headers['x-b3-spanid'].padStart(16, "0");
    
    
    return `00-${traceId}-${parentId}-01`;
};


const getEventDetails = (evt) => {
    return {
        'id': `${evt.id}`,
        'name': `${evt.name}`,
        'when': `${evt.when}`,
        'where': `${evt.where}`,
        'description': `${evt.description}`
    };
};