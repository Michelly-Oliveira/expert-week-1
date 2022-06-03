ASSETSFOLDER=assets/timeline

for mediaFile in `ls $ASSETSFOLDER | grep .mp4`; do
  # remove extension and resolution
  FILENAME=$(echo $mediaFile | sed -n 's/.mp4//p' | sed -n 's/-1920x1080//p')
  INPUT=$ASSETSFOLDER/$mediaFile
  TARGET_FOLDER=$ASSETSFOLDER/$FILENAME

  mkdir -p $TARGET_FOLDER

  # create new files with different resoultions for each file
  OUTPUT=$ASSETSFOLDER/$FILENAME/$FILENAME
  # DURATION=$(ffprobe -i $INPUT -show_format quiet | sed -n 's/duration-//p')
  # Using this other command because couldn't get ffprobe to work
  # get only the seconds (since the files are small), without 00:00:
  DURATION=$(ffmpeg -i $INPUT 2>&1 | grep Duration | sed -n 's/00:00://p' | awk '{print $2}' | tr -d ,)

  OUTPUT144=$OUTPUT-$DURATION-144
  OUTPUT360=$OUTPUT-$DURATION-360
  OUTPUT720=$OUTPUT-$DURATION-720

  # defining props of video, like audio/video codec, bitrate, etc 
  echo 'rendering in 720p'
    ffmpeg -y -i $INPUT \
        -c:a aac -ac 2 \
        -vcodec h264 -acodec aac \
        -ab 128k \
        -movflags frag_keyframe+empty_moov+default_base_moof \
        -b:v 1500k \
        -maxrate 1500k \
        -bufsize 1000k \
        -vf "scale=-1:720" \
        -v quiet \
        $OUTPUT720.mp4
    
    echo 'rendering in 360p'
    ffmpeg -y -i $INPUT \
        -c:a aac -ac 2 \
        -vcodec h264 -acodec aac \
        -ab 128k \
        -movflags frag_keyframe+empty_moov+default_base_moof \
        -b:v 400k \
        -maxrate 400k \
        -bufsize 400k \
        -vf "scale=-1:360" \
        -v quiet \
        $OUTPUT360.mp4
    
    echo 'rendering in 144p'
    ffmpeg -y -i $INPUT \
        -c:a aac -ac 2 \
        -vcodec h264 -acodec aac \
        -ab 128k \
        -movflags frag_keyframe+empty_moov+default_base_moof \
        -b:v 300k \
        -maxrate 300k \
        -bufsize 300k \
        -vf "scale=256:144" \
        -v quiet \
        $OUTPUT144.mp4

    echo $OUTPUT144.mp4
    echo $OUTPUT360.mp4
    echo $OUTPUT720.mp4
done