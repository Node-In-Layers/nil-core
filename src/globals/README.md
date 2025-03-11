# Globals

## Logging

Node In Layers has a robust, yet, simple Logging Framework.
Built in is the ability to log to console, send logs over tcp, or completely replace the logger with a custom logger itself.

The logging framework supports the ability to pass along information as well as ids to subsequent sub-loggers, so that detailed tracing can be performed.

For example, you create a high level logger with id for the overall runtime, as well as one for requests. The request level logger, would include both the runtimeId as well as the requestId.

This information can be passed to subsequent requests, to create an id stack, providing a deep level of tracing and searchability of logs across an entire system.
