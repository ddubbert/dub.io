<template>
  <v-row
    class="ma-0"
    ref="canvasDiv"
    align="center"
    justify="center"
    style="height: 100%; width: 100%;"
  >
    <v-col class="pa-0">
      <div
        :width="canvasSize"
        :height="canvasSize"
      ></div>
      <canvas
        ref="backgroundBoard"
        :width="canvasSize"
        :height="canvasSize"
        :style="`
          border: 1px solid black;
          position: absolute;
          z-index: 5;
          top: ${top};
          left: ${left};
        `"
      ></canvas>
      <canvas
        ref="playerBoard"
        :width="canvasSize"
        :height="canvasSize"
        :style="`
          border: 1px solid black;
          position: absolute;
          z-index: 10;
          top: ${top};
          left: ${left};
        `"
      ></canvas>
      <canvas
        ref="obstacleBoard"
        :width="canvasSize"
        :height="canvasSize"
        :style="`
          border: 1px solid black;
          position: absolute;
          z-index: 15;
          top: ${top};
          left: ${left};
        `"
      ></canvas>
    </v-col>
  </v-row>
</template>

<script>
import drawUtils from '../utils/draw.utils';

export default {
  name: 'GameBoard',
  data() {
    return {
      canvasSize: 500,
      canvasScaling: 1,
      grid: null,
      top: '0px',
      left: '0px',
    };
  },
  computed: {
    canvas() {
      return this.$refs.playerBoard;
    },
    ctx() {
      return this.canvas.getContext('2d');
    },
  },
  created() {
    this.$store.watch(
      (state, getters) => getters.grid,
      (newValue) => {
        if (this.canvas) {
          drawUtils.setGrid(newValue);
        }
      },
    );

    this.$store.watch(
      (state, getters) => getters.userId,
      (newValue) => {
        drawUtils.setUserId(newValue);
      },
    );

    this.$store.watch(
      (state, getters) => getters.musicOn,
      (newValue) => {
        if (newValue) drawUtils.startMusic();
        else drawUtils.stopMusic();
      },
    );
  },
  mounted() {
    const width = this.$refs.canvasDiv.clientWidth;
    const height = this.$refs.canvasDiv.clientHeight;
    this.canvasSize = (width > height) ? height : width;

    this.top = `${this.$refs.canvasDiv.getBoundingClientRect().top}px`;
    this.left = `${this.$refs.canvasDiv.getBoundingClientRect().left + width / 2 - this.canvasSize / 2}px`;

    drawUtils.setCanvasSize(this.canvasSize);
    drawUtils.setPlayerContext(this.ctx);
    drawUtils.setBackgroundContext(this.$refs.backgroundBoard.getContext('2d'));
    drawUtils.setObstacleContext(this.$refs.obstacleBoard.getContext('2d'));
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">

</style>
