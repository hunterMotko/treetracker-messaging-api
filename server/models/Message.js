const { v4: uuid } = require('uuid');
const axios = require('axios').default;

const HttpError = require('../utils/HttpError');
const { getAuthorId } = require('../handlers/helpers');
const RegionRepository = require('../repositories/RegionRepository');

const Message = ({
  id,
  parent_message_id,
  author_handle,
  recipient_handle,
  recipient_organization_id,
  recipient_region_id,
  subject,
  body,
  video_link,
  composed_at,
  survey_response,
  survey_id,
  title,
  questions,
}) =>
  Object.freeze({
    id,
    parent_message_id,
    from: author_handle,
    to: recipient_handle || recipient_organization_id || recipient_region_id,
    subject,
    body,
    composed_at,
    video_link,
    survey: {
      id: survey_id,
      title,
      response: !!survey_response,
      questions,
      answers: [survey_response],
    },
  });

const MessageObject = ({
  subject,
  body,
  composed_at = new Date().toISOString(),
  survey_id = null,
  survey,
  survey_response = null,
  video_link = null,
  author_id,
  active = true,
}) =>
  Object.freeze({
    id: uuid(),
    created_at: new Date().toISOString(),
    subject,
    body,
    composed_at,
    survey_id,
    survey_response: survey_response ? { survey_response } : null,
    video_link,
    author_id,
    active,
  });

const MessageRequestObject = ({
  author_handle,
  recipient_handle = null,
  parent_message_id = null,
  message_id,
  region_id = null,
  organization_id = null,
}) =>
  Object.freeze({
    id: uuid(),
    author_handle,
    recipient_handle,
    message_id,
    parent_message_id,
    recipient_region_id: region_id,
    recipient_organization_id: organization_id,
  });

const MessageDeliveryObject = ({
  parent_message_delivery_id = null,
  message_id,
  recipient_id,
}) =>
  Object.freeze({
    id: uuid(),
    created_at: new Date().toISOString(),
    parent_message_id: parent_message_delivery_id,
    recipient_id,
    message_id,
  });

const SurveyObject = ({ survey }) =>
  Object.freeze({
    id: uuid(),
    title: survey.title,
    created_at: new Date().toISOString(),
    active: true,
  });

const SurveyQuestionObject = ({ rank, prompt, choices, survey_id }) =>
  Object.freeze({
    id: uuid(),
    survey_id,
    rank,
    prompt,
    choices,
    created_at: new Date().toISOString(),
  });

const createMessageResourse = async (messageRepo, requestBody, session) => {
  let { survey_id } = requestBody;
  const { organization_id, region_id } = requestBody;

  let organizationInfo = {};
  let regionInfo = {};

  if (organization_id) {
    // check if organization_id is in the stakeholder API
    const response = await axios.get(
      `${process.env.ENTITY_API}/${organization_id}`,
    );
    organizationInfo = response.data;
    if (!organizationInfo) {
      throw new HttpError(422, 'Invalid organization_id received');
    }
  }

  if (requestBody.region_id) {
    const regionRepo = new RegionRepository(session);
    regionInfo = await regionRepo.getById(region_id);
  }

  // IF this has a survey object, a message/send POST request
  if (requestBody.survey) {
    const surveyObject = SurveyObject({ ...requestBody });
    const survey = await messageRepo.createForOtherTables(
      surveyObject,
      'survey',
    );

    survey_id = survey.id;

    let rank = 1;

    for (const { prompt, choices } of requestBody.survey.questions) {
      const surveyQuestionObject = SurveyQuestionObject({
        survey_id,
        prompt,
        choices,
        rank,
      });
      rank++;
      await messageRepo.createForOtherTables(
        surveyQuestionObject,
        'survey_question',
      );
    }
  }

  const messageObject = MessageObject({ ...requestBody, survey_id });
  const message = await messageRepo.create(messageObject);

  const messageRequestObject = MessageRequestObject({
    ...requestBody,
    message_id: message.id,
  });
  await messageRepo.createForOtherTables(
    messageRequestObject,
    'message_request',
  );

  let parent_message_delivery_id = null;

  // if parent_message_id exists get the message_delivery_id for the parent message
  if (requestBody.parent_message_id) {
    parent_message_delivery_id = await messageRepo.getParentMessageDeliveryId(
      requestBody.parent_message_id,
    );
  }

  if (organization_id) {
    // Get all recipients by organization_id
    // create message_delivery for each of them
  }

  if (region_id) {
    // Get all recipients by region_id
    // create message_delivery for each of them
    // add return statement to prevent message_delivery being created for recipient_id, since that wasn't initially defined
    return;
  }

  const messageDeliveryObject = MessageDeliveryObject({
    ...requestBody,
    message_id: message.id,
    parent_message_delivery_id,
  });
  await messageRepo.createForOtherTables(
    messageDeliveryObject,
    'message_delivery',
  );
};

const FilterCriteria = ({ author_handle, since, author_id }) => {
  return {
    author_handle,
    author_id,
    since: since ? new Date(since).toISOString() : since,
  };
};

const QueryOptions = ({ limit = undefined, offset = undefined }) => {
  return Object.entries({ limit, offset })
    .filter((entry) => entry[1] !== undefined)
    .reduce((result, item) => {
      result[item[0]] = item[1];
      return result;
    }, {});
};

const getMessages =
  (messageRepo) =>
  async (filterCriteria = undefined, url) => {
    let filter = {};
    let options = { limit: 100, offset: 0 };
    const author_id = await getAuthorId(filterCriteria.author_handle);
    filter = FilterCriteria({
      ...filterCriteria,
      author_id,
    });
    options = { ...options, ...QueryOptions({ ...filterCriteria }) };

    const urlWithLimitAndOffset = `${url}&${
      filter.since ? `since=${filter.since}` : ''
    }&limit=${options.limit}&offset=`;

    const next = `${urlWithLimitAndOffset}${+options.offset + +options.limit}`;
    let prev = null;
    if (options.offset - +options.limit >= 0) {
      prev = `${urlWithLimitAndOffset}${+options.offset - +options.limit}`;
    }

    const messages = await messageRepo.getMessages(filter, options);
    return {
      messages: messages.map((row) => {
        return Message({ ...row });
      }),
      links: {
        prev,
        next,
      },
    };
  };

module.exports = {
  createMessageResourse,
  getMessages,
};
