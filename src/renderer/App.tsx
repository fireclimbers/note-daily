import React, { useState, useEffect, useRef } from "react";
import { MemoryRouter as Router, Routes, Route, Link } from "react-router-dom";
import ReactQuill from 'react-quill';
import { dateToString, stringToDate, useConstructor } from './funcs.tsx';
import 'react-quill/dist/quill.snow.css';
import './App.css';




const modules = {
  toolbar: [
    //[{ font: ['monospace','Sans Serif'] }],
    [{ 'header': [1, 2, false] }],
    ['bold', 'italic', 'underline','strike', 'blockquote','code'],
    [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
    ['link', 'image'],
    ['clean']
  ]
}


let timer;

const NoteTaker = (props) => {
  const [value, setValue] = useState('');
  const [title, setTitle] = useState('');
  const [day, setDay] = useState(null);

  const inputEl = useRef(null);

  useConstructor(() => {
    // Listen for loading new note
    window.electron.ipcRenderer.on('ipc-load', (arg) => {
      setValue(arg[0]);
      setTitle(arg[1]);
    });
  });

  useEffect(() => {
    // 1 second after stop typing, save to file
    if (props.day !== day) {
      setDay(props.day);
    } else {
      props.setSaved(false);
      clearTimeout(timer);
      timer = setTimeout(() => {
        window.electron.ipcRenderer.sendMessage('ipc-write', [props.day,value,title]);
        props.setSaved(true);
      }, 1000);
    }
  }, [value,title]);

  useEffect(() => {
    // Add extra tab functionality
    let quill_ = inputEl.current.editor;

    quill_.root.setAttribute('spellcheck', false);

    quill_.keyboard.addBinding({ key: 'tab', altKey: true, handler: (range,context) => {
      let r = quill_.getSelection();
      let length = r.length;
      let i = r.index;
      while (i < r.index+length) {
        //console.log(i,length,quill_.getText(i, 1));
        if (quill_.getText(i, 1) === '\n') {
          quill_.insertText(i+1,'\t');
          length++;
        }
        i++;
      }

    }});

    quill_.keyboard.addBinding({ key: 'tab', shiftKey: true, handler: (range,context) => {
      let r = quill_.getSelection();
      let length = r.length;
      let i = r.index;
      while (i < r.index+length) {
        //console.log(i,length,quill_.getText(i, 1));
        if (quill_.getText(i, 1) === '\n' && quill_.getText(i+1,1) === '\t') {
          quill_.deleteText(i+1, 1);
          length--;
        }
        i++;
      }

    }});
  }, []);

  //console.log(value);  

  return (
    <div>
      {/*<p>{saved ? 'Yes' : 'No'}</p>*/}
      <input style={{margin:'0 24px'}} className="input is-large is-static" type="text" onChange={(e) => setTitle(e.target.value)} value={title} placeholder="Text input"/>
      <p>{day}</p>
      <ReactQuill ref={inputEl} theme="snow" style={{backgroundColor:'white'}} value={value} onChange={setValue} modules={modules} preserveWhitespace />
    </div>
  );
};







const daysStr = ['s','m','t','w','t','f','s'];
const monthsStr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function App() {
  const [day, setDay] = useState(null);
  const [today, setToday] = useState(null);
  const [press, setPress] = useState(0);
  const [dateList, setDateList] = useState([]);

  const [saved, setSaved] = useState(true);

  useConstructor(() => {
    // Set today's date and load today's notes
    let d = new Date();
    while (d.getDay() === 0 || d.getDay() === 6) {
      d = new Date(d.setDate(d.getDate()+1));
    }
    let t = dateToString(d);
    setDay(t);
    setToday(t);
    window.electron.ipcRenderer.sendMessage('ipc-load', t);
    window.electron.ipcRenderer.sendMessage('ipc-load-dates', t);

    window.electron.ipcRenderer.on('ipc-setday', (arg) => {
      setDay(arg);
    });

    window.electron.ipcRenderer.on('ipc-load-dates', (arg) => {
      setDateList(arg);
    });

    window.electron.ipcRenderer.on('ipc-update-title', (arg) => {
      setDateList((prev) => {
        let dl = structuredClone(prev)
        for (let i=0;i<dl.length;i++) {
          for (let j=0;j<dl[i].days.length;j++) {
            if (dl[i].days[j].d === arg[0]) {
              dl[i].days[j].t = arg[1];
            }
          }
        }
        return dl;
      })
    });
  });

  
  function downHandler(e) {
    if (e.metaKey && e.key === "ArrowDown") {
      setPress(1);
    } else if (e.metaKey && e.key === "ArrowUp") {
      setPress(-1);
    }
  }

  // Detect keypress
  useEffect(() => {
    window.addEventListener("keydown", downHandler);
    // Remove event listeners on cleanup
    return () => {
      window.removeEventListener("keydown", downHandler);
    };
  }, []);

  // Change day based on keypress
  useEffect(() => {
    if (press !== 0) {
      let d = stringToDate(day);
      d = new Date(d.setDate(d.getDate()+press));
      while (d.getDay() === 0 || d.getDay() === 6) {
        d = new Date(d.setDate(d.getDate()+press));
      }
      let s = dateToString(d);
      window.electron.ipcRenderer.sendMessage('ipc-load', s);
      setPress(0);
    }
  },[press])

  // Generate list of dates to display
  /*function getDates() {
    let dates = [];
    let d = new Date();
    d = new Date(d.setDate(d.getDate()-14));
    for (let i=0;i<5;i++) {
      let week = {title:'',days:[]};
      let monday = d.getDate() - d.getDay() + 1;

      for (let j=0;j<5;j++) {
        let day = new Date(d.setDate(monday+j));
        week.days.push({d: dateToString(day),s: (day.getMonth()+1).toString()+'/'+day.getDate().toString(), i: daysStr[day.getDay()]});
        if (j === 0) week.title = monthsStr[day.getMonth()] +' '+ day.getDate().toString();
      }
      dates.push(week);
      d = new Date(d.setDate(d.getDate()+7));
    }

    return dates;
  }*/

  // TODO scroll to past/future weeks

  // TODO paste plain text



  // TODO file length preview

  // TODO subfiles under specific day (adding, deleting)

  // TODO find feature?

  

  

  return(
    <Router>
      <aside className="sidebar menu" style={{backgroundColor: '#EBEDEF'}}>
        {dateList.map((item,index) => {
          return [<p key={'title-'+index} className="menu-label">
            {item.title}
          </p>, <ul className="menu-list">
            {item.days.map((item2,index2) => {
              return <li key={'week-'+index+'-'+index2} style={{whiteSpace:'nowrap',overflow:'hidden',backgroundColor: item2.d === day ? '#C7CBD1': item2.d === today ? '#E0E3E6':'#EBEDEF'}}>
                <a onClick={(e) => {window.electron.ipcRenderer.sendMessage('ipc-load', item2.d)}}>

                    <span className="icon" style={{marginRight:'0.5rem',color:saved ? 'black': item2.d === day ? '#a5a5a5': 'black'}}><i className={"fa-solid fa-fw fa-"+item2.i}></i></span>
                    <span>{item2.s + ' — '+item2.t}</span>
                    {/*item2.d === day && (saved && <i className={"fa-solid fa-check"} style={{marginLeft:12}}></i>)*/}

                </a>
              </li>
            })}
          </ul>]
        })}

      </aside>
      <div className="body-text">
      <Routes>
        <Route path="/" element={<NoteTaker day={day} setDay={setDay} setSaved={setSaved} />} />
        <Route
          path="*"
          element={
            <main style={{ padding: "12rem" }}>
              <p>Error: page does not exist</p>
            </main>
          }
        />
      </Routes>
      </div>
    </Router>
  );
}
