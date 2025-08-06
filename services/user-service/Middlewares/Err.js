const ErrorHandler = require("../Utils/ErrorHandler");

const Error = (error,req,res,next) => {
    error.statusCode = error.statusCode || 500;
    error.message = error.message || "Server Error !";

    /* when we face the duplicate key error  */
    if(error.code == 11000){
        const message = `already exists data  : ${Object.keys(error.keyValue)}.`;
        error = new ErrorHandler(message,400);
    }

    /* when we face the casterror */
    if(error.name === "CastError"){
        error = new ErrorHandler(`${error.path} is not found !`,404);
    }

    res.status(error.statusCode).json({
        success: false,
        error: {
            status: error.statusCode,
            message: error.message
        }
    });

    // return next();
}

module.exports = Error;