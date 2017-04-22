#!/bin/bash

echo 'start'

echo 'hello' >> $(dirname $0)/d2/t2
sleep 5
echo 'done'
