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
    var radius = this.width / 3;

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

  _getCorpusFrequency(token) {
    return this.allTokens.get(token);
  }

  updateData(data) {
    this.data = data;

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
    // console.log('this.documents', this.documents);

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
    // console.log('nodes', this.nodes);

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

    // console.log('edges', this.edges);
  }

  updateScales() {
    var self = this;

    var corpusFrequencyDomain = d3.extent(Array.from(this.allTokens.values()));
    var linkWeightDomain = d3.extent(this.edges, (d) => d.weight);


    var linkStrength = d3.scale.linear()
      .domain(linkWeightDomain)
      .range([1, 20]);

    var charge = d3.scale.linear()
      .domain(corpusFrequencyDomain)
      .range([-1000, -5000]);

    this.fontSize = d3.scale.linear()
      .domain(corpusFrequencyDomain)
      .range([12, 32]);

    /*
    function collide(node, alpha) {
      var nx1 = node.bb.x1;
      var nx2 = node.bb.x2;
      var ny1 = node.bb.y1;
      var ny2 = node.bb.y2;

      return function(quad, x1, y1, x2, y2) {
        var node2 = quad.point;
        if (node2 && (node2 !== node) && node.type === 'token' && node2.type === 'token') {

          var isOverlapping = (node.bb.x1 <= node2.bb.x2 &&
            node2.bb.x1 <= node.bb.x2 &&
            node.bb.y1 <= node2.bb.y2 &&
            node2.bb.y1 <= node.bb.y2);

          if(isOverlapping) {
            var xOffset = (node.bb.width/20)// * alpha;
            var yOffset = (node.bb.height/20)// * alpha;
            // console.log(`${node.name} overlaps with ${node2.name}`,
            //   `offset=${xOffset},${yOffset} | width=${node.bb.width}`);
            // Each node is pushed a little bit more in the direction relative
            // to the other in the collision.

            if(node.bb.x1 > node.bb.x2) {
              node.x += xOffset;
              node.bb.x1 += xOffset;

              // node2.x -= xOffset;
              // node2.bb.x1 -= xOffset;
            } else {
              node.x -= xOffset;
              node.bb.x1 -= xOffset;

              // node2.x += xOffset;
              // node2.bb.x1 += xOffset;
            }

            if(node.bb.y1 > node.bb.y1) {
              node.y += yOffset;
              node.bb.y1 += yOffset;

              // node2.y -= xOffset;
              // node2.bb.y1 -= xOffset;
            } else {
              node.y -= yOffset;
              node.bb.y1 -= yOffset;

              // node2.y += yOffset;
              // node2.bb.y1 += yOffset;
            }
          }
        }
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      };
    }
    */

    function collide(node) {
      var r = (node.bb.width * 0.5) + 55,
          nx1 = node.bb.x1 - r,
          nx2 = node.bb.x1 + r,
          ny1 = node.bb.y1 - r,
          ny2 = node.bb.y1 + r;
      return function(quad, x1, y1, x2, y2) {
        var node2 = quad.point;
        if (quad.point && (quad.point !== node) && node.type === 'token' && node2.type === 'token') {
          var x = node.bb.x1 - node2.bb.x1,
              y = node.bb.y1 - node2.bb.y1,
              l = Math.sqrt(x * x + y * y),
              r = (node.bb.width * 0.5) + (quad.point.bb.width * 0.5);
          if (l < r) {
            l = (l - r) / l * .5;
            node.x -= x *= l;
            node.y -= y *= l;
            quad.point.x += x;
            quad.point.y += y;
          }
        }
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      };
    }

    function tick(e) {
      // uncomment this to turn on collision detection and resolution
      // var q = d3.geom.quadtree(self.nodes);
      //
      // for (let n of self.nodes) {
      //   q.visit(collide(n, e.alpha));
      // }

      self.render();
    }
    this.force = d3.layout.force()
      .nodes(this.nodes)
      .links(this.edges)
      .size([this.width, this.height])
      .linkStrength((d) => linkStrength(d.weight))
      // .charge(-2000)
      .charge((d) => {
        var c = charge(this._getCorpusFrequency(d.name));
        return c;
      })
      .on('tick', tick);

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
      .attr('opacity', 0)
      .style('stroke-width', 1)
      .style('stroke', () => {
        return 'grey';
      });

    var node = svg.selectAll('.node')
      .data(this.nodes);

    var nodeEnter = node.enter()
      .append('g')
        .attr('class', 'node');

    nodeEnter.filter((d) => d.type === 'document')
      .append('circle')
        .attr('class', 'nodeContent')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 5)
        .attr('fill', 'grey');

    var tokenGroup = nodeEnter.filter((d) => d.type === 'token')
      .append('g')
        .attr('class', 'nodeContent');

      tokenGroup.append('text')
        .text((d) => d.name)
        .attr('class', 'token')
        .attr('font-size', (d) => this.fontSize(this._getCorpusFrequency(d.name)))
        .attr('fill', 'grey')
        .attr('text-anchor', 'middle');
      tokenGroup.append('rect')
        .attr('class', 'bb')
        .attr('stroke', 'pink')
        .attr('fill', 'none')
        .attr('stroke-weight', 1);

    node
      .attr('class', 'node')
      .attr('transform', function(d) {
        // Calculate and store bounding boxes for nodes.
        // This will be used when calculating collisions
        var boxSelector = d.type === 'document' ? 'circle.nodeContent' : 'text.token';
        var bb = d3.select(this).select(boxSelector).node().getBBox();

        var left = d.x - (bb.width / 2);
        var top = d.y - bb.height;

        d.bb = {
          x1: left,
          y1: top,
          x2: left + bb.width,
          y2: top + bb.height,
          width: bb.width,
          height: bb.height
        };

        d3.select(this).select('rect.bb')
          .attr('x', left - d.x)
          .attr('y', top - d.y)
          .attr('width', bb.width)
          .attr('height', bb.height);


        return `translate(${d.x},${d.y})`;
      });
      // .call(this.force.drag);;
  }
}
