'use client';

import { MantineProvider, createTheme } from '@mantine/core';
import { ReactNode } from 'react';
import '@mantine/core/styles.css';

type ProvidersProps = {
  children: ReactNode;
};

const theme = createTheme({
  /** Mantine theme 설정 */
});

export function Providers({ children }: ProvidersProps) {
  return (
    <MantineProvider theme={theme}>
      {children}
    </MantineProvider>
  );
}

