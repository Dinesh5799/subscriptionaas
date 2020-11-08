function isNULLEMPTYORUNDEFINED(value) {
  if (value === null || value === undefined || value === "") return true;
  return false;
}

function getISTTime(givenDate) {
  if (givenDate === undefined) return formatDateToIST(new Date());
  return formatDateToIST(givenDate, true);
}

function getISTTimeWithoutHMS(givenDate) {
  if (givenDate === undefined) return formatDateToIST(new Date());
  return formatDateToIST(givenDate, false);
}

function formatDateToIST(formattedDate, sendHMS) {
  let date = new Date(formattedDate);
  let utc = date.getTime() + date.getTimezoneOffset() * 60000;
  let istTime = new Date(utc + 3600000 * "+5.5");
  let istDate = istTime.getDate().toString();
  istDate = istDate.length === 1 ? `0${istDate}` : istDate;
  let istMonth = (istTime.getMonth() + 1).toString();
  istMonth = istMonth.length === 1 ? `0${istMonth}` : istMonth;
  let istYear = istTime.getFullYear().toString();
  let formattedIST = `${istYear}-${istMonth}-${istDate}`;
  if (!sendHMS) return formattedIST;
  let istHours = istTime.getHours().toString();
  istHours = istHours.length === 1 ? `0${istHours}` : istHours;
  let istMinutes = istTime.getMinutes().toString();
  istMinutes = istMinutes.length === 1 ? `0${istMinutes}` : istMinutes;
  let istSeconds = istTime.getSeconds().toString();
  istSeconds = istSeconds.length === 1 ? `0${istSeconds}` : istSeconds;
  return `${formattedIST} ${istHours}:${istMinutes}:${istSeconds}`;
}

function calculateExpiryDate(start_date, validity) {
  let newDate = new Date(start_date).getTime();
  newDate += parseInt(validity) * 24 * 60 * 60 * 1000;
  return getISTTime(newDate);
}

function formatPlanExpiryDate(start_date, validity) {
  let newDate = new Date(start_date).getTime();
  newDate += parseInt(validity) * 24 * 60 * 60 * 1000;
  return getISTTimeWithoutHMS(newDate);
}

function userNameFormatter(user_name) {
  return user_name.toLocaleLowerCase();
}

module.exports = {
  getISTTime,
  userNameFormatter,
  isNULLEMPTYORUNDEFINED,
};
