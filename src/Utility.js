function isNULLEMPTYORUNDEFINED(value) {
  if (value === null || value === undefined || value === "") return true;
  return false;
}

function getISTTime() {
  let date = new Date();
  let utc = date.getTime() + date.getTimezoneOffset() * 60000;
  let istTime = new Date(utc + 3600000 * "+5.5");
  let istDate = istTime.getDate().toString();
  istDate = istDate.length === 1 ? `0${istDate}` : istDate;
  let istMonth = (istTime.getMonth() + 1).toString();
  istMonth = istMonth.length === 1 ? `0${istMonth}` : istMonth;
  let istYear = istTime.getFullYear().toString();
  let istHours = istTime.getHours().toString();
  istHours = istHours.length === 1 ? `0${istHours}` : istHours;
  let istMinutes = istTime.getMinutes().toString();
  istMinutes = istMinutes.length === 1 ? `0${istMinutes}` : istMinutes;
  let istSeconds = istTime.getSeconds().toString();
  istSeconds = istSeconds.length === 1 ? `0${istSeconds}` : istSeconds;
  let formattedIST = `${istYear}-${istMonth}-${istDate} ${istHours}:${istMinutes}:${istSeconds}`;
  return formattedIST;
}

module.exports = {
  isNULLEMPTYORUNDEFINED,
  getISTTime,
};
