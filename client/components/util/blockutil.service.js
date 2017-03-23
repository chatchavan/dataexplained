'use strict';

(function () {


  function UtilService() {
    var BlockUtil = {

      /**
       * Decodes a formatted string structured with //startblock\nBLOCKCONTENT//endblock into an array of blocks
       * */
      decodeBlock(blockString){
        // console.log('decodeBlock', blockString);
        //
        // var split = blockString.split('\\n');
        // var blocks = [];
        // let currentBlock;
        // let timestamp;
        //
        // for(let i = 0; i < split.length; i++){
        //   let indexPrefix = split[i].indexOf(BlockUtil.getBlockPrefix());
        //   let indexColon = split[i].indexOf(':');
        //   let indexSuffix = split[i].indexOf(BlockUtil.getBlockSuffix());
        //
        //   //Start new block
        //   if(indexPrefix > -1 && indexColon > -1){
        //     blocks.push({title : split[i].substr(indexColon+1, split[i].length-1)});
        //     currentBlock = blocks[blocks.length -1];
        //   }
        //
        //   //End of current Block
        //   else if(indexSuffix > -1 &&  currentBlock){
        //     let id = split[i].substr(BlockUtil.getBlockSuffix().length+1, split[i].length);
        //     currentBlock.timestamp = timestamp;
        //     currentBlock.blockId = id;
        //     blocks[blocks.length-1] = currentBlock;
        //     timestamp = undefined;
        //     currentBlock = undefined;
        //   }
        //   //Inside current Block
        //   else if(indexColon > -1 && currentBlock){
        //     timestamp = split[i].substr(0, indexColon);
        //     let content = split[i].substr(indexColon+1, split[i].length-1);
        //     if(!currentBlock.content){
        //       currentBlock.content = content;
        //       currentBlock.contentRaw = [{'content' : content, 'timestamp': timestamp}];
        //     }
        //     else{
        //       currentBlock.content += '\\n'+content;
        //       currentBlock.contentRaw.push({'content' : content, 'timestamp': timestamp});
        //
        //     }
        //   }
        //
        // }
        return blockString;
      },

      /**
       * Encodes Array of Blocks into a string of structure //startblock\nBLOCKCONTENT//endblock
       * */
      encodeBlock(blockList){

        var blockString = '';
        for(let i = 0; i < blockList.length; i++){
          if(blockString.length > 0){
            blockString += '\\n';
          }
          blockString += BlockUtil.getBlockPrefix()+':'+blockList[i].title;
          for(let j = 0; j < blockList[i].contentRaw.length; j++){
            blockString += '\\n'+blockList[i].contentRaw[j].timestamp+':'+blockList[i].contentRaw[j].content;
          }
          blockString += '\\n'+BlockUtil.getBlockSuffix();
        }
        return blockString;
      },


      /**
       * Return timestamp of latest log entry in blockString
       * */
      // getLatestTimestamp(blockString){
      //   return BlockUtil.decodeBlock(blockString).timestamp;
      // },

      /**
       * Creates Block-String from an array of single log statements (selection)
       * */
      createBlock(block, selection){
        let timestamp;
        let content = '';
        for(let i = 0; i < selection.length; i++){
          content += selection[i].log;
          if(selection.length-1 > i){
            content += '\\n';
          }

          timestamp = selection[i].timestamp;
        }
        block.timestamp = timestamp;
        block.content = content;
        return block;
      },

      stripeBlockFromList(block, blockList){
        console.log('blocklist',blockList);
        for(var i = 0; i < blockList.length; i++){
          if(blockList[i].content === block.content){
            blockList.splice(i, 1);
            break;
          }
        }
        return BlockUtil.encodeBlock(blockList);
      },

      getBlockPrefix(){
        return "//startBlock";
      },

      getBlockSuffix(){
        return "//endBlock";

      }


    };

    return BlockUtil;
  }

  angular.module('rationalecapApp.util')
    .factory('BlockUtil', UtilService);

})();
