#!/bin/bash

set -euo pipefail

input_dir="$1"
output_dir="$2"

datetime_tag="DateTimeOriginal"
filename_format="%Y%m%d_%H%M%S"

for file in "$input_dir"/*.jpg "$input_dir"/*.JPG; do
    echo "Processing '$file'..."

  # 1. Extract the date/time tag using exiftool
  #    -q: quiet mode (suppress informational messages like '1 image files read')
  #    -p '$Tag': print the value of the tag specified in the format string
  #    -d 'format': specify the desired output format for date/time tags
  datetime_str=$(exiftool -q -p "\$${datetime_tag}" -d "${filename_format}" "$file")

  # 2. Check if the date/time tag was found
  if [ -z "$datetime_str" ]; then
    echo "  Warning: Could not read '$datetime_tag' from '$file'. Skipping this file."
    echo "-------------------------------------"
    continue
  fi

  # 3. Get the file extension (lowercase)
  extension="${file##*.}"
  extension_lower=$(echo "$extension" | tr '[:upper:]' '[:lower:]')

  # 4. Construct the base target filename (without collision handling yet)
  base_target_filename="${datetime_str}.${extension_lower}"
  target_filename="$base_target_filename"
  output_path="$output_dir/$target_filename"

  # 5. Handle potential filename collisions
  counter=1
  while [ -e "$output_path" ]; do
    target_filename="${datetime_str}_${counter}.${extension_lower}"
    output_path="$output_dir/$target_filename"
    counter=$((counter + 1))
  done

  if [ "$target_filename" != "$base_target_filename" ]; then
     echo "  Note: File '$output_dir/$base_target_filename' already existed. Using '$target_filename' instead."
  fi

  # 6. Run exiftran to auto-rotate and save to the new filename
  #    -a: auto-rotate
  #    -p: preserve original file timestamp and permissions on the new file
  #    -g: generate a new EXIF thumbnail
  #    -o <path>: output file path (this prevents in-place modification)
  echo "  Rotating and saving to '$output_path'..."
  exiftran -apg -o "$output_path" "$file"

  # 7. Check exiftran's exit status (optional but recommended)
  if [ $? -eq 0 ]; then
    echo "  Success."
  else
    echo "  Error: exiftran failed for '$file'. The output file '$output_path' might be incomplete or missing." >&2
  fi
  echo "-------------------------------------"

done

shopt -u extglob # Disable extended globbing
echo "Processing complete."
