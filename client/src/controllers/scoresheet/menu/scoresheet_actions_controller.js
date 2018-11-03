class ScoresheetActionsController {
  constructor (scoresheet, $scope, user) {
    Object.assign(this, { data: scoresheet, $scope })
    this.isAdmin = user.isAdmin()
  }

  score () {
    return this.data.score()
  }

  reset () {
    return this.$scope.$emit('reset scoresheet')
  }

  cancel () {
    return this.$scope.$emit('cancel scoresheet')
  }

  defaultEnabled () {
    return this.isAdmin && this.data.current && this.data.current.defaultEnabled
  }

  setDefault () {
    this.$scope.$emit('set scoresheet default')
  }
}

ScoresheetActionsController.$$ngIsClass = true
ScoresheetActionsController.$inject = ['Scoresheet', '$scope', 'User']

export default ScoresheetActionsController
