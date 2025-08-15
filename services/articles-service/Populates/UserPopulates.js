const axios = require("axios");
const ErrorHandler = require("../Utils/ErrorHandler");

const UserPopulate = async (user_id) => {
  try {
    let response = await axios.get(
      `http://user-service:9000/v1/api/user-service/user/find/${user_id}`
    );

    if (!response.data || !response.data.user) {
      if (throwIfNotFound) {
        throw new ErrorHandler("User not found", 404);
      }
      return null;
    }

    return response.data.user;
  } catch (error) {
    if (error.response) {
      throw new ErrorHandler(
        `User service error: ${error.response.data?.message || error.message}`,
        error.response.status
      );
    } else if (error.request) {
      throw new ErrorHandler("User service unavailable", 503);
    } else {
      throw new ErrorHandler(error.message, 500);
    }
  }
};

module.exports = UserPopulate;
