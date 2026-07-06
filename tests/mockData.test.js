import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { categories, inquiries, reviews, rides } from '../src/data/mockData.js';

describe('mock ride data', () => {
  it('has an All category and at least one ride to display', () => {
    assert.equal(categories[0], 'All');
    assert.ok(rides.length > 0);
  });

  it('keeps ride prices and seats as usable numbers', () => {
    for (const ride of rides) {
      assert.equal(typeof ride.price, 'number');
      assert.ok(ride.price >= 0);
      assert.equal(typeof ride.seats, 'number');
      assert.ok(ride.seats > 0);
    }
  });

  it('includes the expected inquiry and review collections', () => {
    assert.ok(Array.isArray(inquiries.sent));
    assert.ok(Array.isArray(inquiries.received));
    assert.ok(reviews.every((review) => review.rating >= 1 && review.rating <= 5));
  });
});
