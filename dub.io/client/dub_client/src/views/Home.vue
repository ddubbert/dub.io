<template>
  <v-container
    fluid
    style="height: 100vh; max-height: 100%;"
  >
    <v-row
      class="mr-2"
      align="center"
      justify="center"
      style="height: 100%; max-height: 100%;"
    >
      <v-col cols="2">
      </v-col>
      <v-col
        cols="8"
        style="height: 100%; max-height: 100%;"
      >
        <GameBoard />
      </v-col>

      <v-col cols="2" class="pr-2">
        <v-row>
          <v-col>
            <v-row>
              <v-col align="center" justify="center">
                <v-text-field
                  label="Username"
                  placeholder="RandomPlayer"
                  v-model="username"
                ></v-text-field>
              </v-col>
            </v-row>

            <v-row>
              <v-col align="center" justify="center">
                <v-color-picker
                  v-model="color"
                  hide-canvas
                  mode="hexa"
                  hide-mode-switch
                  class="no-alpha"
                ></v-color-picker>
              </v-col>
            </v-row>

            <v-row>
              <v-col align="center" justify="center">
                <v-img height="10vh" width="10vh" :src="sprite"></v-img>
                <v-text-field
                  label="Sprite-URI"
                  v-model="sprite"
                >
                  <template v-slot:append>
                    <v-btn small dark @click="resetSprite">
                      <v-icon dark>mdi-undo-variant</v-icon>
                    </v-btn>
                  </template>
                </v-text-field>
              </v-col>
            </v-row>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="3" />
          <v-col cols="6" align="center" justify="center">
            <v-row align="center" justify="center">
              <v-btn dark large color="teal" @click="createUser">
                Add Player
              </v-btn>
            </v-row>
            <v-row align="center" justify="center">
              <v-switch
                :color="musicSwitch ? 'teal' : 'red'"
                v-model="musicSwitch"
                label="Music"
              ></v-switch>
            </v-row>
          </v-col>
          <v-col cols="3" />
        </v-row>

        <v-row align="center" justify="center">
          <v-col cols="4" align="center" justify="center">
            <v-btn dark @click="$store.dispatch('changeDirection', DIRECTIONS.UPLEFT);">
              <v-icon dark>mdi-arrow-top-left-bold-outline</v-icon>
            </v-btn>
          </v-col>

          <v-col cols="4" align="center" justify="center">
            <v-btn dark @click="$store.dispatch('changeDirection', DIRECTIONS.UP);">
              <v-icon dark>mdi-arrow-up-bold-outline</v-icon>
            </v-btn>
          </v-col>

          <v-col cols="4" align="center" justify="center">
            <v-btn dark @click="$store.dispatch('changeDirection', DIRECTIONS.UPRIGHT);">
              <v-icon dark>mdi-arrow-top-right-bold-outline</v-icon>
            </v-btn>
          </v-col>
        </v-row>

        <v-row align="center" justify="center">
          <v-col cols="4" align="center" justify="center">
            <v-btn dark @click="$store.dispatch('changeDirection', DIRECTIONS.LEFT);">
              <v-icon dark>mdi-arrow-left-bold-outline</v-icon>
            </v-btn>
          </v-col>

          <v-col cols="4" align="center" justify="center">
            <v-icon>mdi-arrow-all</v-icon>
            <p>Arrow-Keys</p>
          </v-col>

          <v-col cols="4" align="center" justify="center">
            <v-btn dark @click="$store.dispatch('changeDirection', DIRECTIONS.RIGHT);">
              <v-icon dark>mdi-arrow-right-bold-outline</v-icon>
            </v-btn>
          </v-col>
        </v-row>

        <v-row align="center" justify="center">
          <v-col cols="4" align="center" justify="center">
            <v-btn dark @click="$store.dispatch('changeDirection', DIRECTIONS.DOWNLEFT);">
              <v-icon dark>mdi-arrow-bottom-left-bold-outline</v-icon>
            </v-btn>
          </v-col>

          <v-col cols="4" align="center" justify="center">
            <v-btn dark @click="$store.dispatch('changeDirection', DIRECTIONS.DOWN);">
              <v-icon dark>mdi-arrow-down-bold-outline</v-icon>
            </v-btn>
          </v-col>

          <v-col cols="4" align="center" justify="center">
            <v-btn dark @click="$store.dispatch('changeDirection', DIRECTIONS.DOWNRIGHT);">
              <v-icon dark>mdi-arrow-bottom-right-bold-outline</v-icon>
            </v-btn>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
// @ is an alias to /src
import GameBoard from '@/components/GameBoard.vue';
import DIRECTIONS from '@/utils/enums/Directions';
import gameOptions from '../../../../gameOptions';

export default {
  name: 'Home',
  components: {
    GameBoard,
  },

  data() {
    return {
      sprite: gameOptions.DEFAULT_PLAYER_SPRITE,
      username: '',
      color: '#FF0000FF',
      musicSwitch: false,
      DIRECTIONS,
    };
  },

  methods: {
    resetSprite() {
      this.sprite = gameOptions.DEFAULT_PLAYER_SPRITE;
    },
    createUser() {
      const u = this.username || 'RandomPlayer';
      const s = this.sprite || gameOptions.DEFAULT_PLAYER_SPRITE;
      const c = this.color;

      this.$store.dispatch('createUser', { title: u, sprite: s, color: c });
    },
  },

  watch: {
    musicSwitch(newValue) {
      this.$store.dispatch('switchMusic', newValue);
    },
  },

  mounted() {
    this.$store.dispatch('subscribe');
  },
};
</script>

<style lang="scss">
.no-alpha {
  .v-color-picker__controls {
    .v-color-picker__preview {
      .v-color-picker__sliders {
        .v-color-picker__alpha {
          display: none;
        }
      }
    }
    .v-color-picker__edit {
      .v-color-picker__input:last-child {
        display: none;
      }
    }
  }
}
</style>
