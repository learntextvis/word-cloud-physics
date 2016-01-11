import React from 'react';
import ReactDOM from 'react-dom';
import WordCloud from '../../chart/wordcloud';

import './wordcloud.css';

/**
 * Contains UI for the main configuration options that
 * modify the visualization.
 */
 export default class WordCloudComponent extends React.Component {

  componentDidMount() {
    this.chart = new WordCloud({
      container: ReactDOM.findDOMNode(this)
    });

    this.chart.initialRender();
    this.chart.update(this.props.data, this.props.config);
    this.chart.render();
  }

  componentDidUpdate() {
    this.chart.update(this.props.data, this.props.config);
    this.chart.render();
  }

  render() {
    return (
      <div className='word-cloud'></div>
    );
  }
}

WordCloudComponent.propTypes = {
  // document properties here.
  config: React.PropTypes.object.isRequired,
  data: React.PropTypes.array.isRequired
};
