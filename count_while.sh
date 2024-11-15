#!/bin/bash

# Initialize counter
i=1

# Iterate from 1 to 10 using a while loop
while [ $i -le 10 ]
do
    echo "Number: $i"
    i=$((i + 1))
done 