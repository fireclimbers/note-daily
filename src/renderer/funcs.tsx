import { useRef } from "react";

function dateToString(d) {
  return d.getFullYear().toString()+(d.getMonth()+1).toString().padStart(2,'0')+d.getDate().toString().padStart(2,'0');
}

function stringToDate(s) {
  let year = parseInt(s.substring(0,4));
  let month = parseInt(s.substring(4,6))-1;
  let day = parseInt(s.substring(6,8));

  return new Date(year,month,day);
}


const useConstructor = (callBack = () => {}) => {
  const hasBeenCalled = useRef(false);
  if (hasBeenCalled.current) return;
  callBack();
  hasBeenCalled.current = true;
}


export { dateToString, stringToDate, useConstructor }

