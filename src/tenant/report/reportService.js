const dal = require('./reportDAL');

const getLifeEventsService = async (month, day, type) => {
  const eventType = type || 'both';

  const events = await dal.getLifeEvents(month, day, eventType);

  return events.map((event) => {
    const {
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      email,
      event_date: eventDate,
      event_type: actualEventType,
      contact_id: contactId,
    } = event;

    const nameParts = [firstName, middleName, lastName].filter(Boolean);
    const fullName = nameParts.join(' ');

    return {
      contactId,
      contactName: fullName,
      contactEmail: email,
      phoneNumber: null,
      date: eventDate,
      type: actualEventType,
    };
  });
};

module.exports = {
  getLifeEventsService,
};
