const Session = require('../models/Session');
const MessageRepository = require('../repositories/MessageRepository');
const HttpError = require('../utils/HttpError.js');

const getAuthorId = async (author_handle) => {
  const session = new Session();
  //   Get author id using author handle
  const messageRepo = new MessageRepository(session);
  const authorIdResponse = await messageRepo.getAuthorId(author_handle);
  if (authorIdResponse.length < 1)
    throw new HttpError(404, 'Author handle not found');

  //   if (authorIdResponse.length > 1)
  //     throw new HttpError(404, 'Multiple author handles found');

  return authorIdResponse[0].id;
};

module.exports = { getAuthorId };