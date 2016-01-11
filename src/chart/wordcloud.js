import d3 from 'd3';
import _ from 'lodash';

export default class WordCloud {
  constructor(opts) {
    this.opts = opts;
    this._container = opts.container;;
    this.container = d3.select(this._container);

    this.margins = {
      left: 50,
      right: 50,
      top: 50,
      bottom: 50
    };

    this.width = this._container.clientWidth;
    this.height = this._container.clientHeight;
  }

  documentCenters(numDocuments) {
    var center = [this.width / 2, this.height / 2];
    var radius = this.width / 4;

    if(numDocuments <= 1) {
      return [center];
    }

    var interval = (Math.PI * 2) / numDocuments;
    var startAngle = Math.PI;
    var angles = _.map(_.range(0, numDocuments), (index) => {
      return startAngle + (interval * index);
    });

    var centers = _.map(angles, (angle) => {
      return [
        radius * Math.cos(angle) + center[0],
        radius * Math.sin(angle) + center[1]
      ];
    });

    return centers;
  }

  _getDocNode(nodeList, docId) {
    return _.find(nodeList, (node) => {
      return node.type === 'document' && node.id === docId;
    });
  }

  _getTokenNode(nodeList, token) {
    return _.find(nodeList, (node) => {
      return node.type === 'token' && node.token === token;
    });
  }

  updateData(data) {
    this.data = data;
    console.log('data', data);
    this.centers = this.documentCenters(data.length);

    // Create an array of maps that go from token -> score for each
    // document in the data.
    this.documents = _.map(this.data, (document) => {
      var scores = _.reduce(document.tokens, (map, [token, score]) => {
        map.set(token, score);
        return map;
      }, new Map());
      return scores;
    });
    console.log('this.documents', this.documents);

    // Create a map of token -> score_sum for all tokens across all documents
    this.allTokens = _.reduce(this.documents, (map, docMap) => {
      docMap.forEach((value, key) => {
        var currScore = map.get(key) || 0;
        map.set(key, currScore + value);
      });
      return map;
    }, new Map());

    // Create a node list for the network. There are two types of node in this
    // network. 'Documents' that correnspond to a center to which tokens will be
    // attracted and 'tokens' that are linked to various documents.
    var documentNodes = _.map(this.centers, (center, index) => {
      return {
        type: 'document',
        id: this.data[index].name,
        name: this.data[index].name,
        center: center,
        x: center[0],
        y: center[1],
        fixed: true
      };
    });
    var tokenNodes = _.map(Array.from(this.allTokens), ([token]) => {
      return {
        type: 'token',
        name: token,
        token: token
      };
    });

    this.nodes = documentNodes.concat(tokenNodes);
    console.log('nodes', this.nodes);

    // Create an edge list for the network. The edges go from a geometric
    // center corresponds to each document to each token that appears in that
    // document.
    this.edges = [];
    _.each(this.documents, (document, index) => {
      var docId = this.data[index].id;
      var source = this._getDocNode(this.nodes, docId);
      document.forEach((value, key) => {
        var edge = {
          source: source,
          target: this._getTokenNode(this.nodes, key),
          weight: value
        };
        this.edges.push(edge);
      });
    });

    console.log('edges', this.edges);
  }

  updateScales() {
    var self = this;


    var linkStrength = d3.scale.linear()
      .domain([0, 100])
      .range([1, 20]);

    function end(e) {
      console.log('end', this, e);
      console.log(self.nodes, self.edges);
    }

    function tick() {
      self.render();
    }
    this.force = d3.layout.force()
      .nodes(this.nodes)
      .links(this.edges)
      .size([this.width, this.height])
      .linkStrength((d) => linkStrength(d.weight))
      // .friction(0.9)
      // .linkDistance(20)
      // .charge(-30)
      // .gravity(0.1)
      // .theta(0.8)
      // .alpha(0.1)
      .on('tick', tick)
      .on('end', end);

    this.force.start();
  }

  update(data) {
    this.updateData(data);
    this.updateScales();
  }

  initialRender() {
    this.width = this._container.clientWidth;
    this.height = this._container.clientHeight;

    this.container.append('svg')
      .attr('height', this.height)
      .attr('width', this.width);
  }

  render() {
    var svg = this.container.select('svg');

    var link = svg.selectAll('.link')
      .data(this.edges);

    link.enter().append('line');

    link
      .attr('class', 'link')
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y)
      .style('stroke-width', 1)
      .style('stroke', () => {
        return 'grey';
      });

    var node = svg.selectAll('.node')
      .data(this.nodes);

    node.enter().append('circle')
      .attr('title', (d) => d.name);

    node
      .attr('class', 'node')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', 5)
      .style('fill', (d) => {
        return d.type === 'document' ? 'grey' : 'teal';
      });
      // .call(this.force.drag);;
  }
}
