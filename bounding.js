var Vector = require('./vector');

class Bounding {
  constructor(x=0, y=0, width=100, height=100, rotation=0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.dynamic = false;
    this.rotation = rotation;
    this.isColliding = false;

    this.dx = 0;
    this.dy = 0;
    this.hover = false;

    this.minX = 0;
    this.minY = 0;

    this.maxX = 0;
    this.maxY = 0;

    this.UL = { x: 0, y: 0 };
    this.UR = { x: 0, y: 0 };
    this.LL = { x: 0, y: 0 };
    this.LR = { x: 0, y: 0 };

    this.dirtyAABB = true;

    this.overlap = null;
    this.axisX = null;
    this.axisY = null;
  }

  get left() { return this.x; }
  get right() { return this.x + this.width; }
  get top() { return this.y; }
  get bottom() { return this.y + this.height; }

  get centerX() { return this.x + this.width/2; }
  get centerY() { return this.y + this.height/2; }

  collideWithPoint(x, y) {
    if (this.rotation !== 0) {
      if (!this.isPointInBoundingBox(x, y)) {
        return false;
      }

      var c = Math.cos(this.rotation);
      var s = Math.sin(this.rotation);

      var dx = this.centerX - x;
      var dy = this.centerY - y;

      x = dx * c + dy * s + this.centerX;
      y = -dx * s + dy * c + this.centerY;
    }

    return x >= this.left && y >= this.top && x <= this.right && y <= this.bottom;
  }

  projectAxis(object, x, y) {
    var value;
    var min, max;

    value = Vector.dot(object.UR.x, object.UR.y, x, y);
    min = value;
    max = value;

    value = Vector.dot(object.UL.x, object.UL.y, x, y);
    if (value < min) { min = value; }
    if (value > max) { max = value; }

    value = Vector.dot(object.LL.x, object.LL.y, x, y);
    if (value < min) { min = value; }
    if (value > max) { max = value; }

    value = Vector.dot(object.LR.x, object.LR.y, x, y);
    if (value < min) { min = value; }
    if (value > max) { max = value; }

    return { min: min, max: max };
  }

  collidesOnAxis(other, x, y) {
    var { min: minA, max: maxA } = this.projectAxis(this, x, y);
    var { min: minB, max: maxB } = this.projectAxis(other, x, y);

    var result = minB <= maxA && maxB >= minA;

    if (result) {
      var overlap = 0;
      if (minA < minB) {
        if (maxA < maxB) {
          overlap = maxA - minB;
        } else {
          let option1 = maxA - minB;
          let option2 = maxB - minA;
          overlap = option1 < option2 ? option1 : -option2;
        }
      } else {
        if (maxA > maxB) {
          overlap = minA - maxB;
        } else {
          let option1 = maxA - minB;
          let option2 = maxB - minA;
          overlap = option1 < option2 ? option1 : -option2;
        }
      }

      var absOverlap = Math.abs(overlap);
      if (this.overlap == null || absOverlap < this.overlap) {
        this.overlap = absOverlap;
        this.axisX = x;
        this.axisY = y;
        if (overlap < 0) {
          this.axisX *= -1;
          this.axisY *= -1;
        }
      }
    }

    return result;
  }

  isPointInBoundingBox(x, y) {
    return x >= this.minX && y >= this.minY && x <= this.maxX && y <= this.maxY;
  }

  collidesWithBoundingBox(other) {
    return this.minY < other.maxY && this.minX < other.maxX && this.maxY > other.minY && this.maxX > other.minX;
  }

  collideWith(other) {
    if (!this.collidesWithBoundingBox(other)) { return false; }

    var axis1x = this.UR.x - this.UL.x;
    var axis1y = this.UR.y - this.UL.y;
    var len = Math.sqrt(axis1x * axis1x + axis1y * axis1y);
    axis1x = axis1x/len;
    axis1y = axis1y/len;

    var axis2x = this.UR.x - this.LR.x;
    var axis2y = this.UR.y - this.LR.y;
    len = Math.sqrt(axis2x * axis2x + axis2y * axis2y);
    axis2x = axis2x/len;
    axis2y = axis2y/len;

    var axis3x = other.UL.x - other.LL.x;
    var axis3y = other.UL.y - other.LL.y;
    len = Math.sqrt(axis3x * axis3x + axis3y * axis3y);
    axis3x = axis3x/len;
    axis3y = axis3y/len;

    var axis4x = other.UL.x - other.UR.x;
    var axis4y = other.UL.y - other.UR.y;
    len = Math.sqrt(axis4x * axis4x + axis4y * axis4y);
    axis4x = axis4x/len;
    axis4y = axis4y/len;

    this.overlap = null;
    this.axisX = null;
    this.axisY = null;

    return this.collidesOnAxis(other, axis1x, axis1y) &&
      this.collidesOnAxis(other, axis2x, axis2y) &&
      this.collidesOnAxis(other, axis3x, axis3y) &&
      this.collidesOnAxis(other, axis4x, axis4y);
  }

  resolve(axisX, axisY, overlap) {
    if (this.dynamic) {
      this.x += axisX * overlap;
      this.y += axisY * overlap;
    }
  }

  resolveCollision(other) {
    var xOverlay = 0;
    var yOverlay = 0;

    if (this.centerX > other.centerX) {
      xOverlay = other.right - this.left;
    } else {
      xOverlay = other.left - this.right;
    }

    if (this.centerY > other.centerY) {
      yOverlay = other.bottom - this.top;
    } else {
      yOverlay = other.top - this.bottom;
    }

    if (Math.abs(xOverlay) < Math.abs(yOverlay)) {
      this.x += xOverlay;
    } else {
      this.y += yOverlay;
    }
  }

  calculateMinMax() {
    // if (!this.dirtyAABB) { return; }
    this.dirtyAABB = false;

    var c = Math.cos(-this.rotation);
    var s = Math.sin(-this.rotation);

    var dx = this.left - this.centerX;
    var dy = this.top - this.centerY;

    var x = dx * c + dy * s + this.centerX;
    this.minX = x;
    this.maxX = x;

    var y = -dx * s + dy * c + this.centerY;
    this.minY = y;
    this.maxY = y;

    this.UL.x = x;
    this.UL.y = y;

    dx = this.right - this.centerX;
    dy = this.top - this.centerY;

    x = dx * c + dy * s + this.centerX;
    if (x < this.minX) { this.minX = x; }
    if (x > this.maxX) { this.maxX = x; }

    y = -dx * s + dy * c + this.centerY;
    if (y < this.minY) { this.minY = y; }
    if (y > this.maxY) { this.maxY = y; }

    this.UR.x = x;
    this.UR.y = y;

    dx = this.right - this.centerX;
    dy = this.bottom - this.centerY;

    x = dx * c + dy * s + this.centerX;
    if (x < this.minX) { this.minX = x; }
    if (x > this.maxX) { this.maxX = x; }

    y = -dx * s + dy * c + this.centerY;
    if (y < this.minY) { this.minY = y; }
    if (y > this.maxY) { this.maxY = y; }

    this.LR.x = x;
    this.LR.y = y;

    dx = this.left - this.centerX;
    dy = this.bottom - this.centerY;

    x = dx * c + dy * s + this.centerX;
    if (x < this.minX) { this.minX = x; }
    if (x > this.maxX) { this.maxX = x; }

    y = -dx * s + dy * c + this.centerY;
    if (y < this.minY) { this.minY = y; }
    if (y > this.maxY) { this.maxY = y; }

    this.LL.x = x;
    this.LL.y = y;
  }

  update(time) {
    this.isColliding = false;
    this.hover = false;

    if (this.dynamic) {
      this.dirtyAABB = true;
      this.dx = this.dx + (0 - this.dx) * time * 8;
      this.dy = this.dy + (0 - this.dy) * time * 8;

      this.x += this.dx * time;
      this.y += this.dy * time;
    }

    this.calculateMinMax();
  }

  render(app) {
    if (app.debug.renderAABB) {
      app.video.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
      app.video.ctx.fillRect(this.minX, this.minY, this.maxX - this.minX, this.maxY - this.minY);
    }

    if (app.debug.renderOriginalObject) {
      app.video.ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
      app.video.ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    if (this.isColliding) {
      app.video.ctx.fillStyle = 'rgba(0, 100, 200, 0.6)';
    } else if (this.hover) {
      app.video.ctx.fillStyle = 'rgba(255, 0, 100, 0.9)';
    } else if (this.dynamic) {
      app.video.ctx.fillStyle = 'rgba(0, 200, 100, 0.6)';
    } else {
      app.video.ctx.fillStyle = 'rgba(255, 0, 100, 0.6)';
    }

    app.video.ctx.save();
    app.video.ctx.translate(this.centerX, this.centerY);
    app.video.ctx.rotate(this.rotation);
    app.video.ctx.translate(-this.centerX, -this.centerY);
    app.video.ctx.fillRect(this.x, this.y, this.width, this.height);
    app.video.ctx.restore();

    app.video.ctx.strokeStyle = 'red';
    app.video.ctx.beginPath();
    app.video.ctx.moveTo(this.centerX, this.centerY);
    app.video.ctx.lineTo(this.centerX + this.dx, this.centerY + this.dy);
    app.video.ctx.closePath();
    app.video.ctx.stroke();

    if (app.debug.renderResolvedCollision && this.isColliding && this.overlap != null) {
      app.video.ctx.strokeStyle = 'blue';
      app.video.ctx.beginPath();
      app.video.ctx.moveTo(this.centerX, this.centerY);
      app.video.ctx.lineTo(this.centerX + this.axisX * -this.overlap, this.centerY + this.axisY * -this.overlap);
      app.video.ctx.closePath();
      app.video.ctx.stroke();

      app.video.ctx.fillStyle = 'rgba(100, 0, 100, 0.4)';
      app.video.ctx.save();
      app.video.ctx.translate(this.centerX, this.centerY);
      app.video.ctx.rotate(this.rotation);
      app.video.ctx.translate(-this.centerX, -this.centerY);
      app.video.ctx.fillRect(this.x + this.axisX * -this.overlap, this.y + this.axisY * -this.overlap, this.width, this.height);
      app.video.ctx.restore();
    }
  }
}

module.exports = Bounding;
