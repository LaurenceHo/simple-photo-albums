<template>
  <div
    class="rounded-md border border-surface-100 dark:border-surface-800"
    :data-test-id="dataTestId"
  >
    <button
      class="flex w-full cursor-pointer items-center justify-between px-4 py-3"
      type="button"
      @click="collapsed = !collapsed"
    >
      <slot name="header" />
      <IconChevronDown
        :size="20"
        class="transition-transform duration-200"
        :class="{ '-rotate-180': !collapsed }"
      />
    </button>
    <Transition
      @before-enter="onBeforeEnter"
      @enter="onEnter"
      @after-enter="onAfterEnter"
      @before-leave="onBeforeLeave"
      @leave="onLeave"
      @after-leave="onAfterLeave"
    >
      <div v-show="!collapsed" class="overflow-hidden">
        <div class="px-4 pb-4">
          <slot />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script lang="ts" setup>
import { IconChevronDown } from '@tabler/icons-vue';

defineProps<{
  dataTestId?: string;
}>();

const collapsed = defineModel<boolean>('collapsed', { default: false });

const onBeforeEnter = (el: Element) => {
  const htmlEl = el as HTMLElement;
  htmlEl.style.height = '0';
  htmlEl.style.transition = 'height 0.3s ease-in-out';
};

const onEnter = (el: Element) => {
  const htmlEl = el as HTMLElement;
  htmlEl.style.height = `${htmlEl.scrollHeight}px`;
};

const onAfterEnter = (el: Element) => {
  const htmlEl = el as HTMLElement;
  htmlEl.style.height = '';
  htmlEl.style.transition = '';
};

const onBeforeLeave = (el: Element) => {
  const htmlEl = el as HTMLElement;
  htmlEl.style.height = `${htmlEl.scrollHeight}px`;
  htmlEl.style.transition = 'height 0.3s ease-in-out';
};

const onLeave = (el: Element) => {
  const htmlEl = el as HTMLElement;
  // Force reflow so the browser registers the starting height
  void htmlEl.offsetHeight;
  htmlEl.style.height = '0';
};

const onAfterLeave = (el: Element) => {
  const htmlEl = el as HTMLElement;
  htmlEl.style.height = '';
  htmlEl.style.transition = '';
};
</script>
