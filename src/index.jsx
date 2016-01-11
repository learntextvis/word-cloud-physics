import React from 'react'; //eslint-disable-line
import ReactDOM from 'react-dom';
import WordCloud from './components/wordcloud/wordcloud.jsx';

import '../index.html';

// This will render out an an example of wordcloud

import data from '../data/data.json';
import config from '../data/config.json';

document.addEventListener("DOMContentLoaded", function() {
  console.log("hello")
  ReactDOM.render(
    <WordCloud
      config={config}
      data={data}
    />,
    document.querySelector("#main"));
});
