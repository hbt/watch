#!/bin/bash

node $(dirname $0)/../cli.js --interval=1  --singleton=true $(dirname $0)/sleep.sh `git rev-parse --show-toplevel`

