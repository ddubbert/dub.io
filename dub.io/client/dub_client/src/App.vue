<template>
  <v-app>
    <v-content :height="`${windowHeight}px`">
      <router-view/>
    </v-content>
  </v-app>
</template>

<script>
import DIRECTIONS from '@/utils/enums/Directions';

export default {
  name: 'App',

  components: {
  },

  data: () => ({
    windowHeight: 10,
    possibleKeys: [37, 38, 39, 40],
    keysPressed: {},
  }),
  methods: {
    move() {
      let pre = '';
      let post = '';

      if (this.keysPressed['38']) {
        pre = 'UP';
      }

      if (this.keysPressed['40']) {
        pre = 'DOWN';
      }

      if (this.keysPressed['37']) {
        post = 'LEFT';
      }

      if (this.keysPressed['39']) {
        post = 'RIGHT';
      }

      this.$store.dispatch('changeDirection', DIRECTIONS[`${pre}${post}`]);
    },
  },

  mounted() {
    this.windowHeight = window.innerHeight;
    window.addEventListener('keydown', (e) => {
      if (this.possibleKeys.includes(e.keyCode)) {
        const oldValue = this.keysPressed[e.keyCode];
        this.keysPressed[e.keyCode] = true;
        if (!oldValue) {
          this.move();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (Object.prototype.hasOwnProperty.call(this.keysPressed, e.keyCode)) {
        const oldValue = this.keysPressed[e.keyCode];
        delete this.keysPressed[e.keyCode];
        if (oldValue && Object.keys(this.keysPressed).length > 0) {
          this.move();
        }
      }
    });
  },
};
</script>

<style lang="scss">

</style>
