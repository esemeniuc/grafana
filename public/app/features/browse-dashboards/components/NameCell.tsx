import { css } from '@emotion/css';
import React from 'react';
import Skeleton from 'react-loading-skeleton';
import { CellProps } from 'react-table';

import { GrafanaTheme2 } from '@grafana/data';
import { reportInteraction } from '@grafana/runtime';
import { Icon, IconButton, Link, Spinner, useStyles2, Text } from '@grafana/ui';
import { getSvgSize } from '@grafana/ui/src/components/Icon/utils';
import { getIconForKind } from 'app/features/search/service/utils';

import { Indent } from '../../../core/components/Indent/Indent';
import { useChildrenByParentUIDState } from '../state';
import { DashboardsTreeItem } from '../types';

const CHEVRON_SIZE = 'md';
const ICON_SIZE = 'sm';

type NameCellProps = CellProps<DashboardsTreeItem, unknown> & {
  onFolderClick: (uid: string, newOpenState: boolean) => void;
};

export function NameCell({ row: { original: data }, onFolderClick }: NameCellProps) {
  const styles = useStyles2(getStyles);
  const { item, level, isOpen } = data;
  const childrenByParentUID = useChildrenByParentUIDState();
  const isLoading = isOpen && !childrenByParentUID[item.uid];
  const iconName = getIconForKind(data.item.kind, isOpen);

  if (item.kind === 'ui') {
    return (
      <>
        <Indent
          level={level}
          spacing={{
            xs: 1,
            md: 3,
          }}
        />
        <span className={styles.folderButtonSpacer} />
        {item.uiKind === 'empty-folder' ? (
          <em className={styles.emptyText}>
            <Text variant="body" color="secondary" truncate>
              No items
            </Text>
          </em>
        ) : (
          <Skeleton width={200} />
        )}
      </>
    );
  }

  return (
    <>
      <Indent
        level={level}
        spacing={{
          xs: 1,
          md: 3,
        }}
      />

      {item.kind === 'folder' ? (
        <IconButton
          size={CHEVRON_SIZE}
          className={styles.chevron}
          onClick={() => {
            onFolderClick(item.uid, !isOpen);
          }}
          name={isOpen ? 'angle-down' : 'angle-right'}
          aria-label={isOpen ? `Collapse folder ${item.title}` : `Expand folder ${item.title}`}
        />
      ) : (
        <span className={styles.folderButtonSpacer} />
      )}
      <div className={styles.iconNameContainer}>
        {isLoading ? <Spinner size={ICON_SIZE} /> : <Icon size={ICON_SIZE} name={iconName} />}
        <Text variant="body" truncate>
          {item.url ? (
            <Link
              onClick={() => {
                reportInteraction('manage_dashboards_result_clicked');
              }}
              href={item.url}
              className={styles.link}
            >
              {item.title}
            </Link>
          ) : (
            item.title
          )}
        </Text>
      </div>
    </>
  );
}

const getStyles = (theme: GrafanaTheme2) => {
  return {
    chevron: css({
      marginRight: theme.spacing(1),
      width: getSvgSize(CHEVRON_SIZE),
    }),
    emptyText: css({
      // needed for text to truncate correctly
      overflow: 'hidden',
    }),
    // Should be the same size as the <IconButton /> so Dashboard name is aligned to Folder name siblings
    folderButtonSpacer: css({
      paddingLeft: `calc(${getSvgSize(CHEVRON_SIZE)}px + ${theme.spacing(1)})`,
    }),
    iconNameContainer: css({
      alignItems: 'center',
      display: 'flex',
      gap: theme.spacing(1),
      overflow: 'hidden',
    }),
    link: css({
      '&:hover': {
        textDecoration: 'underline',
      },
    }),
  };
};
