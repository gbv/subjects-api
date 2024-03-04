#!/bin/sh

export DATABASE="${DATABASE:-/data/subjects.db}"

pm2-runtime server.js
